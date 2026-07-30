import { ReactionType } from "../../_context/chats-provider";

export default function MessageReactions({
  reactions,
  isSentFromUser,
}: {
  reactions: ReactionType[];
  isSentFromUser: boolean;
}) {
  return (
    <div
      className={`absolute z-20 -bottom-4 ${
        isSentFromUser ? "right-3" : "left-3"
      }`}
    >
      {reactions.map((reaction: ReactionType, index: number) => (
        <div
          key={index}
          className="flex items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-black"
        >
          <p className="text-xs rounded-xl border border-zinc-200 dark:border-white/25 bg-zinc-100 dark:bg-white/20 px-1 py-0.5">
            {reaction.emoji}
          </p>
        </div>
      ))}
    </div>
  );
}
