import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PlusCircle, SmileIcon } from "lucide-react";

const item = {
  hidden: { opacity: 0, scale: 0 },
  show: { opacity: 1, scale: 1 },
};

const reactions = ["👍🏼", "❤️", "😂", "😮", "🥲", "🙏🏻"];

export default function Reaction({
  isSentFromUser,
}: {
  isSentFromUser: boolean;
}) {
  const [showReactionEmoji, setShowReactionEmoji] = useState(false);
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);

  const handleMouseLeave = () => {
    setShowReactionEmoji(false || reactionMenuOpen);
  };

  const handleMouseOver = () => {
    setShowReactionEmoji(true);
  };

  const handleEmojiClick = () => {
    setReactionMenuOpen((prev) => !prev);
  };

  const renderReactionMenu = () => {
    return (
      <AnimatePresence>
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { scale: 0.8 },
            show: {
              scale: 1,
              transition: { type: "spring", bounce: 0.5, duration: 0.5 },
            },
          }}
          className="absolute z-50 overflow-hidden bg-white rounded-full -top-16 dark:bg-black"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  type: "spring",
                  staggerChildren: 0.05,
                  staggerDirection: isSentFromUser ? -1 : 1,
                  bounce: 0.5,
                  duration: 0.05,
                },
              },
            }}
            initial="hidden"
            animate="show"
            className="flex items-center justify-between w-auto gap-2 p-2 px-4 text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/15"
          >
            {reactions.map((reaction: string, index) => (
              <motion.p
                variants={item}
                className="text-3xl cursor-pointer"
                key={index}
              >
                {reaction}
              </motion.p>
            ))}
            <PlusCircle
              className="cursor-pointer size-8"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div
      className={`relative flex flex-col justify-center items-center ${
        showReactionEmoji ? "opacity-100" : "opacity-0"
      }`}
      onMouseOver={handleMouseOver}  
      onMouseLeave={handleMouseLeave}
    >
      {reactionMenuOpen && renderReactionMenu()}
      <SmileIcon
        className="cursor-pointer size-5 text-zinc-400 dark:text-white/40"
        onClick={handleEmojiClick}
      />
    </div>
  );
}
