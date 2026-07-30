import { createContext, PropsWithChildren, useEffect, useRef, useState } from "react";
import { useChatbotSocket } from "./chatbot-socket-provider";
import { useContacts } from "../_hooks/use-contacts";
import { extractMessageText } from "@/lib/message-text";
import { apiFetch } from "@/lib/api";

export enum Filters {
    ALL = "all",
    UNREAD = "unread",
    FAVORITES = "favorites",
}

export type ReactionType = {
    emoji: string;
    count: number;
};

export type Message = {
    id?: string;         // ConversationMessage.id (for status updates)
    contactId: string;
    message: string;
    timestamp: number;
    isSentFromUser: boolean;
    read?: boolean;
    sent?: boolean;
    delivered?: boolean;
    status?: "sent" | "delivered" | "read" | "failed";
    reactions?: ReactionType[];
    payload?: any;       // Raw message payload for buttons/media
    type: string
};

export type Chat = {
    id: string;
    contactId: string | string[];
    phone?: string;      // Contact phone number
    groupName?: string;
    groupAvatar?: string;
    read: boolean;
    group: boolean;
    favorite: boolean;
    messages: Message[];
};

export type Chats = {
    complete: Chat[];
    filtered: Chat[];
    isLoading: boolean;
};

export const ChatsContext = createContext<
    | undefined
    | {
        filter: string;
        updateFilter: (filter: string) => void;
        search: string;
        updateSearch: (query: string) => void;
        chats: Chats;
        updateChatFavorite: (chatId: string, isFavorite: boolean) => void;
        updateChatRead: (chatId: string, isRead: boolean) => void;
    }
>(undefined);

export default function ChatsProvider({ children }: PropsWithChildren) {
    const [filter, setFilter] = useState<Filters>(Filters.ALL);
    const [search, setSearch] = useState<string>("");
    const [chats, setChats] = useState<Chats>({
        complete: [],
        filtered: [],
        isLoading: false,
    });

    const { channels, appKey, authToken } = useChatbotSocket();
    const { getContact, addContact } = useContacts();

    // Keep a ref so socket callbacks always see latest chats without re-binding
    const chatsRef = useRef<Chat[]>([]);
    chatsRef.current = chats.complete;

    // Refs so filter/search/getContact are always current inside setChats updaters
    const filterRef = useRef<Filters>(Filters.ALL);
    filterRef.current = filter as Filters;
    const searchRef = useRef<string>("");
    searchRef.current = search;
    const getContactRef = useRef(getContact);
    getContactRef.current = getContact;

    const applyFilters = (complete: Chat[]): Chat[] => {
        const currentFilter = filterRef.current;
        const currentSearch = searchRef.current;
        const getC = getContactRef.current;
        return complete.filter((chat) => {
            if (currentFilter === Filters.UNREAD && chat.read === true) return false;
            if (currentFilter === Filters.FAVORITES && chat.favorite !== true) return false;
            if (currentSearch.trim()) {
                const searchLower = currentSearch.toLowerCase();
                const contactId = typeof chat.contactId === "string" ? chat.contactId : "";
                const contact = getC(contactId);
                const searchableText = [
                    contact?.displayName ?? "",
                    chat.groupName ?? "",
                    contactId,
                    chat.messages[chat.messages.length - 1]?.message ?? "",
                ].join(" ").toLowerCase();
                if (!searchableText.includes(searchLower)) return false;
            }
            return true;
        });
    };

    const updateFilter = (filter: string) => {
        setFilter(filter as Filters);
    };

    const updateSearch = (query: string) => {
        setSearch(query);
    };

    useEffect(() => {
        if (!appKey || !authToken) return;
        const fetchChats = async () => {
            setChats((prev) => ({ ...prev, isLoading: true }));
            const response = await apiFetch(`/api/conversations?limit=100&appKey=${encodeURIComponent(appKey)}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const json = await response.json();
            const conversations = json.data ?? [];

            const data: Chat[] = conversations.map((conv: any) => {
                const phone = conv.lead?.phone ?? conv.leadPhone ?? conv.channelPhoneId ?? "";
                const allMessages: Message[] = (conv.messages ?? []).map((msg: any) => ({
                    id: msg.id,
                    type: msg.type,
                    contactId: phone,
                    message: extractMessageText(msg.payload),
                    timestamp: new Date(msg.sentAt).getTime(),
                    isSentFromUser: msg.direction === "OUTBOUND",
                    read: true,
                    status: msg.status ? msg.status.toLowerCase() : (msg.direction === "OUTBOUND" ? "sent" : undefined),
                    payload: msg.payload,
                }));
                return {
                    id: conv.id,
                    contactId: conv.lead?.phone ?? conv.leadPhone ?? conv.channelPhoneId ?? conv.id,
                    phone: conv.lead?.phone ?? conv.leadPhone ?? conv.channelPhoneId,
                    read: !conv.isUnread,
                    group: false,
                    favorite: conv.isFavorite ?? false,
                    messages: allMessages,
                };
            });

            // Sort by latest message timestamp (backend already groups by phone)
            const sorted = data.sort((a: Chat, b: Chat) => {
                const aTime = a.messages[a.messages.length - 1]?.timestamp ?? 0;
                const bTime = b.messages[b.messages.length - 1]?.timestamp ?? 0;
                return bTime - aTime;
            });

            // Seed contacts from conversations (avoids a second API call in contacts-provider)
            for (const conv of conversations) {
                const phone: string = conv.lead?.phone ?? conv.leadPhone ?? conv.channelPhoneId ?? "";
                if (phone && !getContactRef.current(phone)) {
                    addContact({ id: phone, displayName: conv.lead?.name ?? phone, contactAvatar: "", statusMessage: "" });
                }
            }

            setChats((prev) => ({
                ...prev,
                complete: sorted,
                filtered: applyFilters(sorted),
                isLoading: false,
            }));
        };

        fetchChats();
    }, [appKey, authToken]);

    // ── Real-time socket bindings ──────────────────────────────────────────────
    useEffect(() => {
        if (channels.length === 0) return;

        // New conversation started by a visitor
        const onConversationStarted = (data: any) => {
            const phone: string = data.leadPhone ?? data.channelPhoneId ?? data.id;
            const name: string = data.leadName ?? phone;

            // Register contact if not already known
            if (!getContact(phone)) {
                addContact({ id: phone, displayName: name, contactAvatar: "", statusMessage: "" });
            }

            setChats((prev) => {
                // Same conversation ID — already tracked
                if (prev.complete.some((c) => c.id === data.id)) return prev;

                // Same phone number — update the existing chat's id (new session, same contact)
                const existingIdx = prev.complete.findIndex(
                    (c) => typeof c.contactId === "string" && c.contactId === phone
                );
                if (existingIdx !== -1) {
                    const complete = [...prev.complete];
                    complete[existingIdx] = { ...complete[existingIdx], id: data.id, read: false, messages: [] };
                    // Move to top
                    const updated = [complete[existingIdx], ...complete.filter((_, i) => i !== existingIdx)];
                    return { ...prev, complete: updated, filtered: applyFilters(updated) };
                }

                // Truly new contact
                const newChat: Chat = { id: data.id, contactId: phone, read: false, group: false, favorite: false, messages: [] };
                const complete = [newChat, ...prev.complete];
                return { ...prev, complete, filtered: applyFilters(complete) };
            });
        };

        // New message in any conversation
        const onMessageNew = (data: any) => {
            const msg: Message = {
                id: data.id,
                type: data.type,
                contactId: data.leadPhone ?? "",
                message: extractMessageText(data.payload),
                timestamp: data.sentAt ? new Date(data.sentAt).getTime() : Date.now(),
                isSentFromUser: data.direction === "OUTBOUND",
                read: false,
                status: data.direction === "OUTBOUND" ? "sent" : undefined,
                payload: data.payload,
            };

            setChats((prev) => {
                const idx = prev.complete.findIndex((c) => c.id === data.conversationId);
                if (idx === -1) return prev;
                const updated = { ...prev.complete[idx], messages: [...prev.complete[idx].messages, msg], read: false };
                // Move to top
                const complete = [updated, ...prev.complete.filter((_, i) => i !== idx)];
                return { ...prev, complete, filtered: applyFilters(complete) };
            });
        };

        // Status update for a message in any conversation
        const onMessageStatus = (data: any) => {
            setChats((prev) => {
                const idx = prev.complete.findIndex((c) => c.id === data.conversationId);
                if (idx === -1) return prev;
                const chat = prev.complete[idx];
                const updatedMessages = chat.messages.map((m) =>
                    m.id === data.id ? { ...m, status: data.status as Message["status"] } : m,
                );
                const complete = [...prev.complete];
                complete[idx] = { ...chat, messages: updatedMessages };
                return { ...prev, complete, filtered: applyFilters(complete) };
            });
        };

        // Conversation ended (timeout or end-node reached)
        const onConversationEnded = (data: any) => {
            console.log("[Chat] conversation.ended received", data);

            // Register contact if not already known (conversation.started may never have fired)
            const phone: string = data.leadPhone ?? data.channelPhoneId ?? "";
            if (phone && !getContact(phone)) {
                addContact({ id: phone, displayName: data.leadName ?? phone, contactAvatar: "", statusMessage: "" });
            }

            setChats((prev) => {
                const summaryMsg: Message = {
                    id: `ended-${data.conversationId}`,
                    type: "conversation-ended",
                    contactId: phone,
                    message: data.reason === "timeout" ? "⏱ Conversation timed out" : "✅ Conversation completed",
                    timestamp: data.endedAt ? new Date(data.endedAt).getTime() : Date.now(),
                    isSentFromUser: false,
                    payload: data,
                };
                // 1) Try exact conversation ID match
                let idx = prev.complete.findIndex((c) => c.id === data.conversationId);
                // 2) Fall back to phone number match (conversation.started may not have fired)
                if (idx === -1 && phone) {
                    idx = prev.complete.findIndex(
                        (c) => typeof c.contactId === "string" && c.contactId === phone,
                    );
                }
                // 3) Conversation not in list yet — create a new entry so agents can see and assign it
                if (idx === -1) {
                    const newChat: Chat = {
                        id: data.conversationId,
                        contactId: phone || data.conversationId,
                        phone: phone || undefined,
                        read: false,
                        group: false,
                        favorite: false,
                        messages: [summaryMsg],
                    };
                    const complete = [newChat, ...prev.complete];
                    return { ...prev, complete, filtered: applyFilters(complete) };
                }
                const complete = [...prev.complete];
                // Update the id to the current conversationId so future events match
                complete[idx] = {
                    ...complete[idx],
                    id: data.conversationId,
                    messages: [...complete[idx].messages, summaryMsg],
                };
                return { ...prev, complete, filtered: applyFilters(complete) };
            });
        };

        for (const ch of channels) {
            ch.bind("conversation.started", onConversationStarted);
            ch.bind("message.new", onMessageNew);
            ch.bind("message.status", onMessageStatus);
            ch.bind("conversation.ended", onConversationEnded);
        }

        return () => {
            for (const ch of channels) {
                ch.unbind("conversation.started", onConversationStarted);
                ch.unbind("message.new", onMessageNew);
                ch.unbind("message.status", onMessageStatus);
                ch.unbind("conversation.ended", onConversationEnded);
            }
        };
    }, [channels]);

    // ── Filter & Search ─────────────────────────────────────────────────────────
    useEffect(() => {
        setChats((prev) => {
            const complete = prev.complete;

            const filtered = complete.filter((chat) => {
                // Apply filter
                if (filter === Filters.UNREAD && chat.read === true) {
                    return false; // Skip read chats when on UNREAD tab
                }
                if (filter === Filters.FAVORITES && chat.favorite !== true) {
                    return false; // Skip non-favorite chats when on FAVORITES tab
                }

                // Apply search
                if (search.trim()) {
                    const searchLower = search.toLowerCase();
                    const contactId = typeof chat.contactId === "string" ? chat.contactId : "";
                    const contact = getContact(contactId);
                    const searchableText = [
                        contact?.displayName ?? "",
                        chat.groupName ?? "",
                        contactId,
                        chat.messages[chat.messages.length - 1]?.message ?? "",
                    ]
                        .join(" ")
                        .toLowerCase();

                    if (!searchableText.includes(searchLower)) {
                        return false;
                    }
                }

                return true;
            });

            return {
                ...prev,
                filtered,
            };
        });
    }, [filter, search, getContact]);

    const updateChatFavorite = (chatId: string, isFavorite: boolean) => {
        setChats((prev) => {
            const updated = prev.complete.map((chat) =>
                chat.id === chatId ? { ...chat, favorite: isFavorite } : chat,
            );
            return { ...prev, complete: updated, filtered: updated };
        });
    };

    const updateChatRead = (chatId: string, isRead: boolean) => {
        setChats((prev) => {
            const updated = prev.complete.map((chat) =>
                chat.id === chatId ? { ...chat, read: isRead } : chat,
            );
            return { ...prev, complete: updated, filtered: updated };
        });
    };

    return (
        <ChatsContext.Provider
            value={{ chats, filter, search, updateFilter, updateSearch, updateChatFavorite, updateChatRead }}
        >
            {children}
        </ChatsContext.Provider>
    );
}
