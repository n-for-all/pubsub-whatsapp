
import { CircleDashed, Cog, MessageCircle, MessageCircleMore, Settings, Users } from "lucide-react";
import { useTab } from "../_hooks/use-tab";

export default function TabIcon({ tab }: { tab?: string }) {
    const { selectedTab } = useTab();

    let Component = Cog;
    if (tab === "chats") {
        Component = MessageCircle;
    } else if (tab === "status") {
        Component = CircleDashed;
    } else if (tab === "channels") {
        Component = MessageCircleMore;
    } else if (tab === "communities") {
        Component = Users;
    } else if (tab === "settings") {
        Component = Settings;
    }

    return (
        <Component
            strokeWidth={1}
            className={`size-6 ${selectedTab === tab ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-400"
                }`}
        />
    );
}
