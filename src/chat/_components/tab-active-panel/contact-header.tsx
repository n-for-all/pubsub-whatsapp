import { Power, Loader2, Check, Copy, LogOut } from "lucide-react";
import { useCurrentChat } from "../../_hooks/use-current-chat";
import { useChatbotSocket } from "../../_context/chatbot-socket-provider";
import Profile from "../profile";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function ContactHeader() {
    const { contact, chatId, channelUserId, loadCurrentChat } = useCurrentChat();
    const { authToken, agentId } = useChatbotSocket();
    const [botActive, setBotActive] = useState(true);
    const [botStatusLoading, setBotStatusLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [releaseLoading, setReleaseLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const isClaimedByMe = channelUserId === agentId;

    // Fetch bot status when contact changes
    useEffect(() => {
        const fetchBotStatus = async () => {
            if (!contact?.id || !authToken) {
                setBotStatusLoading(false);
                return;
            }

            setBotStatusLoading(true);
            try {
                const response = await apiFetch(
                    `/api/conversations/bot-status?leadPhone=${encodeURIComponent(contact.id)}`,
                    {
                        token: authToken,
                        method: "GET",
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // If status exists and is ACTIVE, show as active; otherwise inactive
                    const status = data.data?.status;
                    setBotActive(status === "ACTIVE");
                } else {
                    // If endpoint returns 404 or error, assume bot is active by default
                    setBotActive(true);
                }
            } catch (error) {
                console.error("Failed to fetch bot status:", error);
                setBotActive(true); // Default to active on error
            } finally {
                setBotStatusLoading(false);
            }
        };

        fetchBotStatus();
    }, [contact?.id, authToken]);

    const toggleBotStatus = async () => {
        if (!contact?.id || !authToken) return;
        setIsLoading(true);
        try {
            const newStatus = botActive ? "INACTIVE" : "ACTIVE";
            const response = await apiFetch("/api/conversations/bot-status", {
                token: authToken,
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ leadPhone: contact.id, status: newStatus }),
            });
            if (response.ok) setBotActive(!botActive);
        } catch (error) {
            console.error("Failed to update bot status:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRelease = async () => {
        if (!chatId || !authToken) return;
        setReleaseLoading(true);
        try {
            const res = await apiFetch(`/api/conversations/${chatId}/release`, {
                token: authToken,
                method: "POST",
            });
            if (res.ok) {
                loadCurrentChat({ channelUserId: null, claimedAt: null });
            }
        } catch (e) {
            console.error("Release failed:", e);
        } finally {
            setReleaseLoading(false);
        }
    };

    return (
        <div className="z-40 w-full bg-white dark:bg-black h-fit">
            <div className="flex items-center justify-between w-full h-full gap-4 p-3 px-4 bg-zinc-100 dark:bg-white/10">
                <div className="flex items-center justify-start gap-4">
                    <Profile name={contact?.displayName} size="10" url={contact?.contactAvatar} />
                    <div className="inline-flex flex-col mr-4 text-zinc-900 dark:text-white">
                        <p className="text-zinc-900 dark:text-white">{contact?.displayName}</p>
                        <span className="inline-flex gap-2 mr-4">
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(contact?.id || "");
                                    setCopiedId(contact?.id || "");
                                    setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="flex items-center gap-1 transition-all cursor-pointer opacity-60 hover:opacity-100"
                            >
                                <span>{`${contact?.id}`}</span>
                                {copiedId === contact?.id ? (
                                    <Check className="size-3.5 text-green-400" />
                                ) : (
                                    <Copy className="size-3.5" />
                                )}
                            </span>
                        </span>
                    </div>
                </div>
                <section className="flex items-center justify-end gap-2">
                    {isClaimedByMe && (

                            <button
                                onClick={handleRelease}
                                disabled={releaseLoading}
                                className="p-2 transition-all rounded-lg cursor-pointer bg-zinc-600/30 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-600/40 disabled:opacity-50"
                                title="Release this conversation"
                            >
                                {releaseLoading ? <Loader2 className="size-5 animate-spin" /> : <LogOut className="size-5" />}
                            </button>

                    )}

                        <button
                            onClick={toggleBotStatus}
                            disabled={isLoading || botStatusLoading}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${
                                botActive
                                    ? "bg-green-600/30 text-green-800 dark:text-green-600 hover:bg-green-600/40"
                                    : "bg-red-600/30 text-red-400 hover:bg-red-600/40"
                            } ${isLoading || botStatusLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {isLoading || botStatusLoading ? (
                                <Loader2 className="size-5 animate-spin" />
                            ) : (
                                <Power className="size-5" />
                            )}
                        </button>

                </section>
            </div>
        </div>
    );
}

