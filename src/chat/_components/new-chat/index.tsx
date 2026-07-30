import { useNewChat } from "../../_hooks/use-new-chat";
import TooltipWrapper from "../tooltip-wrapper";
import { AnimatePresence, motion } from "motion/react";
import Profile from "../profile";
import { useContacts } from "../../_hooks/use-contacts";
import { Contact } from "../../_context/contacts-provider";
import { useEffect, useRef } from "react";
import { ArrowLeft, UserPlus, Users } from "lucide-react";

export default function NewChatWindow() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isNewChatWindowOpen, closeNewChatWindow } = useNewChat();
  const { dictionary, filterContacts, search } = useContacts();

  useEffect(() => {
    if (isNewChatWindowOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNewChatWindowOpen]);

  const renderDictionary = (entries: [string, Contact[]], index: number) => {
    return (
      <section key={index} className="flex flex-col w-full gap-1 px-4 pt-4">
        {entries[1].length >= 1 && (
          <p className="pl-4 mb-4 font-semibold text-zinc-400 dark:text-white/50">{entries[0]}</p>
        )}
        {entries[1].map((contact: Contact) => (
          <div
            key={contact.id}
            className="flex w-full justify-start items-center gap-4 p-2.5 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl cursor-pointer"
          >
            <Profile name={contact.displayName} size="12" url={contact.contactAvatar} />
            <div className="flex flex-col items-start justify-center">
              <p className="text-zinc-900 dark:text-white">{contact.displayName}</p>
              <p className="text-zinc-400 dark:text-white/55">{contact.statusMessage}</p>
            </div>
          </div>
        ))}
      </section>
    );
  };

  return (
    <AnimatePresence>
      {isNewChatWindowOpen && (
        <motion.section
          className="absolute top-0 z-10 w-full h-full bg-white dark:bg-zinc-900"
          initial={{ left: "-100%" }}
          animate={{ left: 0 }}
          exit={{ left: "-100%" }}
          transition={{ duration: 0.15, ease: "easeIn" }}
        >
          <section className="flex flex-col w-full h-full bg-white dark:bg-black/90">
            <section className="flex items-center justify-start w-full gap-2 px-4 pt-4">
              <TooltipWrapper onClick={closeNewChatWindow} showTooltip={false}>
                <ArrowLeft className="text-zinc-700 dark:text-white size-6" />
              </TooltipWrapper>
              <p className="ml-2 text-zinc-900 dark:text-white">New Chat</p>
            </section>
            <section className="w-full px-4 pt-4">
              <input
                className="rounded-full w-full p-2 px-4 outline-none bg-zinc-100 dark:bg-white/10 hover:ring-[1px] hover:ring-zinc-300 dark:hover:ring-zinc-600 focus:ring-2 focus:ring-green-500 ring-0 ring-transparent focus:bg-white dark:focus:bg-transparent placeholder-zinc-400 dark:placeholder-zinc-400 text-zinc-900 dark:text-white"
                placeholder="Search for name or number"
                onChange={(event) => filterContacts(event.target.value)}
                ref={inputRef}
              />
            </section>
            <section className="w-full h-full pb-4 overflow-y-scroll scrollbar-hide">
              {search.length === 0 && (
                <section className="flex flex-col w-full gap-1 px-4 pt-4">
                  <div className="flex w-full justify-start items-center gap-4 p-2.5 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-center bg-green-500 rounded-full size-12">
                      <Users className="text-white size-6" />
                    </div>
                    <div className="flex flex-col items-start justify-center">
                      <p className="font-semibold text-zinc-900 dark:text-white">New Group</p>
                    </div>
                  </div>
                  <div className="flex w-full justify-start items-center gap-4 p-2.5 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-center bg-green-500 rounded-full size-12">
                      <UserPlus
                        className="text-white size-6"
                      />
                    </div>
                    <div className="flex flex-col items-start justify-center">
                      <p className="font-semibold text-zinc-900 dark:text-white">New Contact</p>
                    </div>
                  </div>
                  <div className="flex w-full justify-start items-center gap-4 p-2.5 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl cursor-pointer">
                    <div className="flex items-center justify-center bg-green-500 rounded-full size-12">
                      <Users
                        className="text-white size-6"
                      />
                    </div>
                    <div className="flex flex-col items-start justify-center">
                      <p className="font-semibold text-zinc-900 dark:text-white">New Community</p>
                    </div>
                  </div>
                </section>
              )}
              <section className="flex flex-col w-full gap-1 px-4 pt-4">
                <p className="pl-4 mb-4 font-semibold text-zinc-400 dark:text-white/50">
                  Contacts on App
                </p>
              </section>
              {dictionary.map(renderDictionary)}
            </section>
          </section>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
