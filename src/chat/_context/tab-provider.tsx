import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { HashRouter, useNavigate, useLocation } from "react-router-dom";

const TOP_TABS = ["chats"];

export const TabContext = createContext<
  | undefined
  | { selectedTab: string; selectTab: (tab: string) => void; topTabs: string[] }
>(undefined);

function TabProviderInner({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Remove leading slash: "/chats" -> "chats", "/" -> ""
  const currentPath = location.pathname.slice(1);
  const selectedTab = currentPath || "chats";

  const selectTab = (tab: string) => {
    navigate(`/${tab}`);
  };

  return (
    <TabContext.Provider value={{ selectedTab, selectTab, topTabs: TOP_TABS }}>
      {children}
    </TabContext.Provider>
  );
}

export default function TabProvider({ children }: PropsWithChildren) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <TabContext.Provider value={{ selectedTab: "chats", selectTab: () => {}, topTabs: TOP_TABS }}>
        {children}
      </TabContext.Provider>
    );
  }

  return (
    <HashRouter>
      <TabProviderInner>{children}</TabProviderInner>
    </HashRouter>
  );
}
