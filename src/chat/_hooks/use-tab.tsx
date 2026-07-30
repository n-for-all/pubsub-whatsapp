import { useContext } from "react";
import { TabContext } from "../_context/tab-provider";

export const useTab = () => {
  const ctx = useContext(TabContext);

  if (!ctx) {
    throw new Error("useTab must be used within a TabProvider");
  }
  return ctx;
};
