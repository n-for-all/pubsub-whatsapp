import { useContext } from "react";
import { CurrentChatContext } from "../_context/current-chat-provider";

export const useCurrentChat = () => {
  const ctx = useContext(CurrentChatContext);

  if (!ctx) {
    throw new Error("useCurrentChat must be used within a CurrentChatProvider");
  }
  return ctx;
};
