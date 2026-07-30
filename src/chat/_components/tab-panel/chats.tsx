
import TooltipWrapper from "../tooltip-wrapper";
import { useNewChat } from "../../_hooks/use-new-chat";
import { useChats } from "../../_hooks/use-chats";
import { Chat, Filters, Message } from "../../_context/chats-provider";
import Profile from "../profile";
import { useContacts } from "../../_hooks/use-contacts";
import { useCurrentChat } from "../../_hooks/use-current-chat";
import { useChatbotSocket } from "../../_context/chatbot-socket-provider";

import MessageStatusIcon from "../message-status-icon";
import { formatUptime } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { EllipsisVertical, MessageCircle, Users, Copy, Check, Star, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function Chats({ selectedTab }: { selectedTab: string }) {
    const { openNewChatWindow, isNewChatWindowOpen } = useNewChat();
    const { disconnect, activeLabel, connected, connecting, openDialog } = useChatbotSocket();
    const {
        filter,
        updateFilter,
        search,
        updateSearch,
        updateChatFavorite,
        updateChatRead,
        chats: { filtered, isLoading },
    } = useChats();
    const { getContact } = useContacts();
    const { loadCurrentChat, contact } = useCurrentChat();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const markAsRead = async (conversationId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await apiFetch("/api/conversations/mark-read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId }),
            });
            if (response.ok) {
                updateChatRead(conversationId, true);
            }
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const toggleFavorite = async (conversationId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await apiFetch("/api/conversations/toggle-favorite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId }),
            });
            if (response.ok) {
                const data = await response.json();
                updateChatFavorite(conversationId, data.data.isFavorite);
            }
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
        }
    };

    const getMetaMessage = (
        chat: Chat,
        { message, contactId, type, payload }: Message
    ): string => {
        if (type === "lead-context") {
            const context = payload?.context ?? {};
            const parts = Object.entries(context).map(([k, v]) => `${k}: ${v}`);
            return parts.join(" · ");
        }
        if (chat.group) {
            return `${getContact(contactId)?.displayName}: ${message}`;
        }
        if (contact?.typing && contact.id === contactId) {
            return "typing...";
        }
        return message;
    };

    const renderChat = (chat: Chat, index: number) => {
        const currentContact = getContact(
            typeof chat.contactId === "string" ? chat.contactId : ""
        );
        const name =
            typeof chat.contactId === "string"
                ? currentContact?.displayName
                : chat.groupName;
        const lastMessage = chat.messages[chat.messages.length - 1];  // Get newest message (last since sorted ascending)

        const id = currentContact?.id ?? null;
        return (
            <div
                key={index}
                onClick={() => {
                    loadCurrentChat({ chatId: chat.id, page: 0, messages: chat.messages });
                    if (!chat.read) {
                        markAsRead(chat.id, new MouseEvent("click") as any);
                    }
                }}
                className={`outline-none relative flex w-full gap-2 p-2.5 hover:bg-zinc-100 dark:hover:bg-white/10 pr-4 rounded cursor-pointer group ${typeof chat.contactId === "string" && chat.contactId === contact?.id
                    ? "bg-zinc-100 dark:bg-white/10"
                    : "bg-transparent dark:bg-white/5"
                    }`}
            >
                {!chat.read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                )}
                <div className="flex-shrink-0">
                    {!chat.group ? (
                        <Profile name={currentContact?.displayName} size="12" url={currentContact?.contactAvatar} />
                    ) : (
                        <Profile name={currentContact?.displayName} size="12">
                            <div className="flex items-center justify-center w-full h-full bg-zinc-200 dark:bg-white/50">
                                <Users className="text-zinc-600 dark:text-white size-7" />
                            </div>
                        </Profile>
                    )}
                </div>
                <div className="flex flex-col items-start justify-center flex-1 w-full text-sm">
                    <p className="text-zinc-900 dark:text-white flex flex-col">
                        {id ? (
                            <span className="inline-flex items-center gap-2 mr-4">
                                <span className="opacity-80">{`${id}`}</span>
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(id);
                                        setCopiedId(id);
                                        setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="transition-all cursor-pointer opacity-60 hover:opacity-100"
                                >
                                    {copiedId === id ? (
                                        <Check className="text-green-400 size-3" />
                                    ) : (
                                        <Copy className="size-3" />
                                    )}
                                </span>
                            </span>
                        ) : ""}
                        <span className="text-xs opacity-60">{name}</span>
                    </p>
                    {lastMessage && (
                        <div className="flex items-center justify-start w-full gap-1 mt-1">
                            <MessageStatusIcon message={lastMessage} />
                            {contact?.typing && contact.id === lastMessage.contactId ? (
                                <p className="text-sm text-emerald-500">
                                    {getMetaMessage(chat, lastMessage)}
                                </p>
                            ) : (
                                <p
                                    className={`text-xs ${chat.read || lastMessage.isSentFromUser
                                        ? "text-zinc-400 dark:text-white/55"
                                        : "text-zinc-900 dark:text-white font-semibold"
                                        } whitespace-nowrap truncate max-w-80 text-ellipsis overflow-hidden`}
                                >
                                    {getMetaMessage(chat, lastMessage)}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div className="absolute flex items-center justify-end flex-shrink-0 gap-2 right-4">
                    {lastMessage && (
                        <p
                            className={`text-xs ${chat.read || lastMessage.isSentFromUser
                                ? "text-zinc-400 dark:text-white/30"
                                : "text-emerald-500 dark:text-emerald-400"
                                }`}
                        >
                            {formatUptime(lastMessage.timestamp)}
                        </p>
                    )}
                    <button
                        onClick={(e) => toggleFavorite(chat.id, e)}
                        className={`transition-all ${chat.favorite ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}
                    >
                        <Star
                            className={`size-4 ${chat.favorite ? "fill-amber-500 text-amber-500" : "text-zinc-300 dark:text-white/40 hover:text-zinc-500 dark:hover:text-white/60"}`}
                        />
                    </button>
                </div>
            </div>
        );
    };

    const renderChats = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center w-full h-full text-zinc-300 dark:text-white/50">
                    Loading...
                </div>
            );
        }

        return filtered.map(renderChat);
    };

    return (
        <section className="relative flex flex-col w-full h-full gap-3 p-4">
            <section className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-0.5">
                    <p className="text-2xl font-semibold capitalize text-zinc-900 dark:text-white">
                        {selectedTab}
                    </p>
                    {activeLabel && (
                        <div className="flex items-center gap-1.5">
                            <span className={`inline-block size-1.5 rounded-full shrink-0 ${connected ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                            <span className="text-xs text-zinc-400 dark:text-white/40 truncate max-w-[120px]">{activeLabel}</span>
                            <button
                                type="button"
                                onClick={disconnect}
                                className="flex items-center gap-0.5 text-[10px] text-zinc-400 dark:text-white/30 hover:text-zinc-700 dark:hover:text-white/70 transition-colors"
                                title="Switch app"
                            >
                                <RefreshCw className="size-2.5" />
                                Switch
                            </button>
                        </div>
                    )}
                </div>
                <section className="items-center justify-between gap-2 hidden">
                    <TooltipWrapper showTooltip={false} onClick={openNewChatWindow}>
                        <MessageCircle className="text-zinc-600 dark:text-white size-6" />
                    </TooltipWrapper>
                    <TooltipWrapper showTooltip={false}>
                        <EllipsisVertical
                            className="text-zinc-600 dark:text-white size-6"
                        />
                    </TooltipWrapper>
                </section>
            </section>
            {!connected && !connecting && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 border rounded bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
                    <p className="text-xs">Not connected to any app.</p>
                    <button
                        type="button"
                        onClick={openDialog}
                        className="text-xs font-medium underline underline-offset-2 hover:no-underline shrink-0"
                    >
                        Connect
                    </button>
                </div>
            )}
            <section className="flex flex-col w-full gap-1">
                <input
                    className="rounded-full w-full p-2 px-4 outline-none bg-zinc-100 dark:bg-white/10 hover:ring-[1px] hover:ring-zinc-300 dark:hover:ring-zinc-600 focus:ring-2 focus:ring-green-500 ring-0 ring-transparent focus:bg-white dark:focus:bg-transparent placeholder-zinc-400 dark:placeholder-zinc-400 text-zinc-900 dark:text-white"
                    placeholder="Search for chats..."
                    value={search}
                    onChange={(e) => updateSearch(e.target.value)}
                />
                <div className="flex items-center justify-start gap-2 mt-2 text-zinc-700 dark:text-white">
                    {Object.values(Filters).map((f: string) => (
                        <button
                            key={f}
                            className={`${
                                f === filter
                                    ? "bg-green-600/20 text-green-700 dark:text-green-100 border-green-500/40"
                                    : "border-zinc-200 dark:border-white/20 hover:bg-zinc-100 dark:hover:bg-white/10"
                            } text-sm p-1 px-3 border rounded-full cursor-pointer capitalize`}
                            onClick={() => updateFilter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </section>
            <section className="flex flex-col flex-1 w-full min-h-0 gap-1 overflow-y-auto">
                {renderChats()}
            </section>
        </section>
    );
}
