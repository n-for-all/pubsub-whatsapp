import NewChatWindow from "./new-chat";
import TabPanelSwitcher from "./tab-panel/index";
import { useTab } from "../_hooks/use-tab";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

export default function TabPanel() {
  const { selectedTab } = useTab();
  const [show, setShow] = useState(false);

  // Hide TabPanel for settings
  if (selectedTab === "settings") {
    return null;
  }

  return (
    <section
      className={
        "absolute left-16 transition-all duration-500 ease md:left-0 z-40 w-120 max-w-[80%] h-full md:relative bg-white dark:bg-black/90 border-r border-zinc-200 dark:border-zinc-300/20 flex flex-col overflow-hidden " +
        (show ? "translate-x-0" : "-translate-x-full md:translate-x-0 ml-4 hover:ml-6 md:hover:ml-0 md:ml-0")
      }
    >
      <div className="flex-1 min-h-0">
        <TabPanelSwitcher />
      </div>
      <NewChatWindow />
      <div
        onClick={(e) => {
          setShow(!show);
          e.stopPropagation();
        }}
        className="absolute md:hidden cursor-pointer right-auto left-full h-10 flex items-center rounded-l-md -ml-4 top-1/2 bg-red-500 z-50"
      >
        <ChevronLeft className={"h-4 w-4 dark:text-black text-white transition-all ease duration-1000 " + (!show ? 'rotate-180' : 'rotate-0')} />
      </div>
    </section>
  );
}
