import { useRef, useState, useEffect } from "react";
import { Message } from "../../_context/chats-provider";
import { useCurrentChat } from "../../_hooks/use-current-chat";
import { useChatbotSocket } from "../../_context/chatbot-socket-provider";
import Reaction from "../message/reaction";
import ContactHeader from "./contact-header";
import MessageBubble from "@/components/chatbot/message-bubble";
import MessageStatusIcon from "../message-status-icon";
import MessageReactions from "./message-reactions";
import { Send, Loader2, Computer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function CurrentChat() {
    const { chatId, messages, isLoading, channelPhoneId, leadPhone, channelUserId, loadCurrentChat } = useCurrentChat();
    const { authToken, agentId, openDialog } = useChatbotSocket();
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [assignLoading, setAssignLoading] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const isClaimed = !!channelUserId;
    const isClaimedByMe = channelUserId === agentId;
    const isClaimedByOther = isClaimed && !isClaimedByMe;

    const lastInboundMessage = [...messages].reverse().find((m) => !m.isSentFromUser);
    const isWindowExpired = lastInboundMessage
        ? Date.now() - lastInboundMessage.timestamp > 24 * 60 * 60 * 1000
        : true;

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const msg = text.trim();
        if (!msg || !chatId || !authToken || !isClaimedByMe) return;
        setText("");
        setSendError(null);
        setSending(true);
        try {
            const res = await apiFetch(`/api/conversations/${chatId}/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ message: msg, channelPhoneId, leadPhone }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setSendError(data?.error || `Failed to send (${res.status})`);
                setText(msg); // restore so the user can retry
            }
        } catch (err: any) {
            setSendError(err?.message || "Network error — message not sent");
            setText(msg);
        } finally {
            setSending(false);
        }
    };

    const handleAssign = async () => {
        if (!chatId || !authToken) return;
        setAssignLoading(true);
        try {
            const res = await apiFetch(`/api/conversations/${chatId}/claim`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                loadCurrentChat({ channelUserId: agentId, claimedAt: new Date().toISOString() });
            }
        } catch (e) {
            console.error("Assign failed:", e);
        } finally {
            setAssignLoading(false);
        }
    };

    if (!chatId) {
        return (
            <section className="flex items-center justify-center w-full h-full text-zinc-400 dark:text-white">
                Please select a chat to see messages
            </section>
        );
    }

    const getMessageSpacing = (
        index: number,
        reactionsCount?: number
    ): string => {
        if (index === messages.length - 1) {
            return "mb-0";
        } else if (reactionsCount && reactionsCount > 0) {
            return "mb-4";
        } else if (
            messages[index].isSentFromUser === messages[index + 1]?.isSentFromUser &&
            messages[index].contactId === messages[index + 1]?.contactId
        ) {
            return "mb-0.5";
        }
        return "mb-4";
    };

    return (
        <section className="relative flex flex-col w-full h-full overflow-hidden">
            <ContactHeader />
            {!isClaimed && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 backdrop-blur-sm bg-black/10 dark:bg-black/20">
                    <Computer className="size-8 text-zinc-600 dark:text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">This conversation is not assigned</p>
                    {!authToken ? (
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">You must be authenticated to assign conversations</p>
                            <Button onClick={openDialog}>
                                Connect to Chat
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleAssign}
                            disabled={assignLoading}
                        >
                            {assignLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                            Assign to me
                        </Button>
                    )}
                </div>
            )}
            {isClaimedByOther && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 backdrop-blur-sm bg-black/10 dark:bg-black/20">
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Assigned to another agent</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">You cannot send messages</p>
                </div>
            )}
            <div className="relative flex flex-col items-center flex-1 w-full min-h-0">
                <div className="absolute w-full h-full background-custom"></div>

                <section className="relative flex flex-col items-center flex-1 w-full min-h-0 p-4 overflow-y-auto" ref={messagesContainerRef}>
                    <div className="flex items-center justify-center w-full">
                        <div className="z-20 overflow-hidden rounded-full bg-zinc-700 w-fit dark:bg-black">
                            <p className="w-full h-full p-1 px-2 text-xs bg-black/10 dark:bg-white/20 text-white/80 dark:text-white/55">
                                Today
                            </p>
                        </div>
                    </div>
                    {isLoading && <div className="text-zinc-400 dark:text-white">Loading...</div>}
                    {messages.map((message: Message, index: number) => (
                        <div
                            className="w-full"
                            key={index}
                        >
                            <div className={`w-full flex items-center ${message.isSentFromUser ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`flex justify-between gap-2 items-center ${getMessageSpacing(
                                        index,
                                        message.reactions?.length
                                    )} relative`}
                                >
                                    {message.isSentFromUser ? <Reaction isSentFromUser={true} /> : null}
                                    <MessageBubble
                                        message={{
                                            id: message.id,
                                            type: message.type,
                                            payload: message.payload,
                                            message: message.message,
                                            direction: message.isSentFromUser ? "OUTBOUND" : "INBOUND",
                                            timestamp: message.timestamp,
                                            status: message.status,
                                        }}
                                        conversationId={chatId}
                                        statusIcon={message.isSentFromUser ? <MessageStatusIcon message={message} isInMessage /> : undefined}
                                    />
                                    {/* {!message.isSentFromUser && <Reaction isSentFromUser={false} />} */}
                                    {message.reactions?.length && (
                                        <MessageReactions
                                            reactions={message.reactions}
                                            isSentFromUser={message.isSentFromUser}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {isClaimed && (
                    <section className="z-50 w-full bg-zinc-100 shadow-3xl shrink-0 dark:bg-white/10">
                        {!authToken && (
                            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    You must be authenticated to send messages.
                                </p>
                                <Button size="sm" variant="outline" onClick={openDialog}>
                                    Connect
                                </Button>
                            </div>
                        )}
                        {isWindowExpired && (
                            <div className="flex items-center justify-center px-4 py-2 border-b border-zinc-200 dark:border-white/10">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    The 24-hour messaging window has expired. You can only reply once the customer sends a new message.
                                </p>
                            </div>
                        )}
                        {sendError && (
                            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
                                <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>
                                <button
                                    type="button"
                                    onClick={() => setSendError(null)}
                                    className="text-red-400 transition-colors shrink-0 hover:text-red-600 dark:hover:text-red-300"
                                    aria-label="Dismiss error"
                                >
                                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                        )}
                        <div className="p-4">
                            <form onSubmit={handleSend}>
                                <div className="overflow-hidden rounded-full bg-zinc-200 dark:bg-black">
                                    <div className="flex items-center bg-white rounded-full dark:bg-white/15">
                                        <input
                                            className={`w-full p-3 px-4 text-sm bg-transparent rounded-l-full outline-none text-zinc-900 placeholder-zinc-400 dark:text-white dark:bg-black/60 caret-green-500 dark:placeholder-white/30 ${isWindowExpired ? "cursor-not-allowed" : ""}`}
                                            placeholder="Type a message"
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            disabled={sending || !authToken || isWindowExpired}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!text.trim() || sending || !authToken || isWindowExpired}
                                            className="pl-2 pr-4 text-green-500 disabled:opacity-30 shrink-0"
                                        >
                                            <Send className="size-5" />
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </section>
                )}
            </div>
        </section>
    );
}
