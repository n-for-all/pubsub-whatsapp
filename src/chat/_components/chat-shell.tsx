import TabActivePanel from "./tab-active-panel";
import TabDetails from "./tab-details";
import TabIcons from "./tab-icons";
import TabPanel from "./tab-panel";
import { Toaster } from "@/components/ui/sonner";

export default function ChatShell() {
    return (
        <div className="scrollbar-dark h-screen overflow-hidden">
            <section className="flex w-full h-full">
                <TabIcons />
                <TabPanel />
                <TabActivePanel />
                <TabDetails />
            </section>
            <Toaster />
        </div>
    );
}
