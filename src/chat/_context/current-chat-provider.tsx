import { createContext, PropsWithChildren, useEffect, useRef, useState } from "react";
import { Chat, Message } from "./chats-provider";
import { useChats } from "../_hooks/use-chats";
import { useContacts } from "../_hooks/use-contacts";
import { Contact } from "./contacts-provider";
import { useChatbotSocket } from "./chatbot-socket-provider";
import { extractMessageText } from "@/lib/message-text";
import { apiFetch } from "@/lib/api";

const getTimestamp = () => new Date().toISOString();

export type CurrentChatContacts = {
    [contactId: string]: Contact | undefined;
};

export type CurrentChatContactsGroup = {
    name: string;
    avatar: string;
    contacts: CurrentChatContacts;
};

export type CurrentChatData = {
    chatId: string | null;
    contact: Contact | null;
    messages: Message[];
    group: CurrentChatContactsGroup | null;
    page: number;
    isLoading: boolean;
    /** WA phone_number_id — needed for replies */
    channelPhoneId: string | null;
    /** Visitor's phone number — needed for replies */
    leadPhone: string | null;
    /** Agent currently owning this conversation (null = unclaimed) */
    channelUserId: string | null;
    /** When the current claim was set */
    claimedAt: string | null;
};

export type CurrentChat = CurrentChatData & {
    loadCurrentChat: (chat: Partial<CurrentChatData>) => void;
};

export const CurrentChatContext = createContext<undefined | CurrentChat>(
    undefined
);

export default function CurrentChatProvider({ children }: PropsWithChildren) {
    const [currentChat, setCurrentChat] = useState<CurrentChatData>({
        chatId: null,
        channelPhoneId: null,
        leadPhone: null,
        channelUserId: null,
        claimedAt: null,
        contact: null,
        messages: [],
        group: null,
        page: 0,
        isLoading: false,
    });
    const {
        chats: { complete },
    } = useChats();
    const { contacts, setIsContactTyping } = useContacts();
    const { channels, appKey, authToken } = useChatbotSocket();

    // Keep refs so socket callbacks always see current values without re-binding
    const leadPhoneRef = useRef<string | null>(null);
    const currentChatIdRef = useRef<string | null>(null);
    leadPhoneRef.current = currentChat.leadPhone;
    currentChatIdRef.current = currentChat.chatId;

    // ── Real-time: append incoming messages to the open conversation ───────────
    useEffect(() => {
        if (channels.length === 0) return;

        const onMessageNew = (data: any) => {
            // Check if message belongs to current phone/chat
            // Priority: leadPhone (new) > conversationId (fallback for backward compatibility)
            let shouldProcess = false;
            
            if (data.leadPhone && leadPhoneRef.current) {
                shouldProcess = data.leadPhone === leadPhoneRef.current;
            } else if (data.conversationId && currentChatIdRef.current) {
                shouldProcess = data.conversationId === currentChatIdRef.current;
            }
            
            if (!shouldProcess) return;

            const msg: Message = {
                id: data.id,
                type: data.type,
                contactId: data.direction === "OUTBOUND" ? "bot" : (data.leadPhone ?? data.conversationId),
                message: extractMessageText(data.payload),
                timestamp: data.sentAt ? new Date(data.sentAt).getTime() : Date.now(),
                isSentFromUser: data.direction === "OUTBOUND",
                read: true,
                status: data.direction === "OUTBOUND" ? "sent" : undefined,
                payload: data.payload,
            };

            setCurrentChat((prev) => ({
                ...prev,
                messages: [...prev.messages, msg],
            }));
        };

        const onMessageStatus = (data: any) => {
            let shouldProcess = false;
            
            if (data.leadPhone && leadPhoneRef.current) {
                shouldProcess = data.leadPhone === leadPhoneRef.current;
            } else if (data.conversationId && currentChatIdRef.current) {
                shouldProcess = data.conversationId === currentChatIdRef.current;
            }
            
            if (!shouldProcess) return;
            setCurrentChat((prev) => ({
                ...prev,
                messages: prev.messages.map((m) =>
                    m.id === data.id ? { ...m, status: data.status } : m,
                ),
            }));
        };

        // Keep claim state in sync when another agent claims/releases this conversation
        const onClaimed = (data: any) => {
            if (data.conversationId !== currentChatIdRef.current) return;
            setCurrentChat((prev) => ({ ...prev, channelUserId: data.agentId, claimedAt: new Date().toISOString() }));
        };
        const onReleased = (data: any) => {
            if (data.conversationId !== currentChatIdRef.current) return;
            setCurrentChat((prev) => ({ ...prev, channelUserId: null, claimedAt: null }));
        };

        for (const ch of channels) {
            ch.bind("message.new", onMessageNew);
            ch.bind("message.status", onMessageStatus);
            ch.bind("conversation.claimed", onClaimed);
            ch.bind("conversation.released", onReleased);
        }

        return () => {
            for (const ch of channels) {
                ch.unbind("message.new", onMessageNew);
                ch.unbind("message.status", onMessageStatus);
                ch.unbind("conversation.claimed", onClaimed);
                ch.unbind("conversation.released", onReleased);
            }
        };
    }, [channels]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!currentChat.chatId) return;
            
            // Get the phone number from the current chat
            const chat = complete.find((c: Chat) => c.id === currentChat.chatId);
            if (!chat || typeof chat.contactId !== "string") {
                setCurrentChat((prev) => ({ ...prev, isLoading: false }));
                return;
            }
            
            const phone = chat.contactId;
            
            // Set leadPhone immediately so socket events can be filtered
            setCurrentChat((prev) => ({ ...prev, leadPhone: phone, isLoading: true }));
            
            const response = await apiFetch(
                `/api/conversations?search=${encodeURIComponent(phone)}&page=${currentChat.page}&limit=100&appKey=${encodeURIComponent(appKey)}`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );
            const json = await response.json();
            const paginatedData = json.data ?? [];
            
            // Find the conversation for this phone
            const conv = paginatedData.find((c: any) => 
                c.leadPhone === phone || c.channelPhoneId === phone
            );
            const conversations = conv ? [conv] : [];
            const rawMessages: any[] = conv?.messages ?? [];

            // Use the first conversation's details, or construct from messages
            const contactPhone: string = conv?.lead?.phone ?? conv?.leadPhone ?? phone ?? "";
            const channelPhoneId: string | null = conv?.channelPhoneId ?? null;
            
            const messages: Message[] = rawMessages.map((msg: any) => ({
                id: msg.id,
                type: msg.type,
                contactId: contactPhone,
                message: extractMessageText(msg.payload),
                timestamp: new Date(msg.sentAt).getTime(),
                isSentFromUser: msg.direction === "OUTBOUND",
                read: true,
                status: msg.status?.toLowerCase() as Message["status"],
                payload: msg.payload,
            }));

            setCurrentChat((prev) => ({
                ...prev,
                channelPhoneId,
                leadPhone: phone,
                channelUserId: conv?.channelUserId ?? null,
                claimedAt: conv?.claimedAt ?? null,
                messages:
                    currentChat.page > 0
                        ? [...messages, ...prev.messages]
                        : [...messages],
                isLoading: false,
            }));
        };

        fetchMessages();
    }, [currentChat.chatId, currentChat.page, complete]);

    useEffect(() => {
        const chat = complete.find((chat: Chat) => chat.id === currentChat.chatId);
        if (chat) {
            if (typeof chat.contactId == "string") {
                const contactId = chat.contactId;
                const contact = contacts.find(
                    (contact: Contact) => contact.id === contactId
                );
                if (contact) {
                    setCurrentChat((prev) => ({
                        ...prev,
                        contact,
                        group: null,
                    }));
                }
            } else {
                const groupContacts: CurrentChatContacts = {};
                chat.contactId.forEach((groupContact: string) => {
                    groupContacts[groupContact] = contacts.find(
                        (contact: Contact) => contact.id === groupContact
                    );
                });
                setCurrentChat((prev) => ({
                    ...prev,
                    contact: null,
                    group: {
                        name: chat.groupName ?? "",
                        avatar: chat.groupAvatar ?? "",
                        contacts: groupContacts,
                    },
                }));
            }
        }
    }, [complete, contacts, currentChat.chatId]);

    const loadCurrentChat = (chat: Partial<CurrentChat>) => {
        setCurrentChat((prev) => ({
            ...prev,
            ...chat,
        }));
    };

    return (
        <CurrentChatContext.Provider
            value={{ ...currentChat, loadCurrentChat }}
        >
            {children}
        </CurrentChatContext.Provider>
    );
}
