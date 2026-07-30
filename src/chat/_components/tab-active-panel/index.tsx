import { Cog, Settings2 } from "lucide-react";
import { useTab } from "../../_hooks/use-tab";

import CurrentChat from "./current-chat";
import Settings from "../settings";

export default function TabActivePanel() {
  const { selectedTab } = useTab();

  if (selectedTab === "chats") {
    return (
      <section className="w-full z-30 flex-shrink-0 h-full flex-1 overflow-hidden bg-zinc-50 dark:bg-black/90">
        <CurrentChat />
      </section>
    );
  }

  if (selectedTab === "settings") {
    return (
      <section className="w-full h-full col-span-13 md:col-span-23 overflow-hidden bg-zinc-50 dark:bg-black/90">
        <Settings />
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center w-full h-full gap-4 col-span-6 md:col-span-16 bg-zinc-50 dark:bg-black/90">
      <Settings2 className="size-10 text-zinc-400" />
      <p className="text-3xl text-zinc-900 capitalize dark:text-white">{selectedTab}</p>
    </section>
  );
}
