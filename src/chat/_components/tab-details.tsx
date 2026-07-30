import NewChatWindow from "./new-chat";
import TabPanelSwitcher from "./tab-panel/index";
import ContactDetails from "./contact-details";
import { useTab } from "../_hooks/use-tab";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useCurrentChat } from "../_hooks/use-current-chat";

export default function TabDetails() {
  const { selectedTab } = useTab();
  const [show, setShow] = useState(false);
  const { loadCurrentChat, contact } = useCurrentChat();

  // Hide TabPanel for settings
  if (selectedTab === "settings") {
    return null;
  }

  console.log(contact);

  return (
    <section
      className={
        "absolute right-0 transition-all duration-500 ease md:left-0 z-40 w-120 max-w-[80%] h-full md:relative bg-white dark:bg-black/90 border-l border-zinc-200 dark:border-zinc-300/20 flex flex-col overflow-hidden " +
        (show ? "w-96" : "w-4 ml-4 hover:ml-6 md:hover:ml-0 md:ml-0")
      }
    >
      <div className="absolute inset-0">
        <div className="flex-1 min-h-0 pl-4">
          <section className="relative flex flex-col w-full h-full gap-3 p-4">
            <ContactDetails displayName={contact?.displayName} />
          </section>
        </div>
        <div
          onClick={(e) => {
            setShow(!show);
            e.stopPropagation();
          }}
          className="absolute cursor-pointer left-auto right-full h-full flex items-center -mr-4 top-0 bg-zinc-100 z-50"
        >
          <ChevronLeft className={"h-4 w-4 dark:text-white text-black transition-all ease duration-1000 " + (show ? 'rotate-180' : 'rotate-0')} />
        </div>
      </div>
    </section>
  );
}
