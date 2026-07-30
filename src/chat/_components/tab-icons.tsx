import TooltipWrapper from "./tooltip-wrapper";
import { useTab } from "../_hooks/use-tab";
import TabIcon from "./tab-icon";

export default function TabIcons() {
    const { selectedTab, selectTab, topTabs } = useTab();

    return (
        <section className="flex z-50 flex-col w-16 flex-shrink-0 justify-between items-center h-full bg-zinc-100 dark:bg-black/85 border-r border-zinc-200 dark:border-zinc-500/20">
            <section className="flex flex-col items-center justify-between gap-2 py-4">
                {topTabs.map((tab: string, index: number) => (
                    <TooltipWrapper
                        key={index}
                        selected={selectedTab === tab}
                        onClick={() => selectTab(tab)}
                        tab={tab}
                    >
                        <TabIcon tab={tab} />
                    </TooltipWrapper>
                ))}
            </section>
            <section className="flex flex-col items-center justify-between gap-2 py-4">
                <hr className="px-4 w-full border-t border-zinc-200 dark:border-zinc-500/35" />
                <TooltipWrapper
                    selected={selectedTab === "settings"}
                    onClick={() => selectTab("settings")}
                    tab="settings"
                >
                    <TabIcon tab="settings" />
                </TooltipWrapper>
            </section>
        </section>
    );
}
