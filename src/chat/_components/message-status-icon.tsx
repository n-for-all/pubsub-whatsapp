
import { Check, CheckCheck, CircleAlert, Clock } from "lucide-react";
import { Message } from "../_context/chats-provider";

export default function MessageStatusIcon({
    message,
    isInMessage,
}: {
    message: Message;
    isInMessage?: boolean;
}) {
    const size = isInMessage ? "size-4" : "size-4";

    if (!message.isSentFromUser) return null;
    if (message.type === "lead-context") return null;

    const status = message.status;

    if (status === "read") {
        return <CheckCheck className={`${size} flex-shrink-0 text-blue-600 dark:text-blue-400`} />;
    }
    if (status === "delivered") {
        return <CheckCheck className={`${size} flex-shrink-0 text-zinc-600 dark:text-zinc-400`} />;
    }
    if (status === "sent") {
        return <Check className={`${size} flex-shrink-0 text-black/60 dark:text-white/60`} />;
    }
    if (status === "failed") {
        return <CircleAlert className={`${size} flex-shrink-0 text-red-400 dark:text-red-400`} />;
    }
    // No status yet — message is still in-flight
    return <Clock className={`${size} flex-shrink-0 text-black/30 dark:text-white/30`} />;
}
