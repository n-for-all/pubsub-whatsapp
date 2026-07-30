import { useTab } from "../../_hooks/use-tab";
import Chats from "./chats";

export default function TabPanelSwitcher() {
  const { selectedTab } = useTab();

  if (selectedTab === "chats") {
    return <Chats selectedTab={selectedTab} />;
  }

  return null;
}
