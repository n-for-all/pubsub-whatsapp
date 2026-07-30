import ThemeProvider from '@/chat/_context/theme-provider'
import ChatShell from '@/chat/_components/chat-shell'
import { AppConfigsProvider } from '@/chat/_context/app-configs-provider'
import ChatbotSocketProvider from '@/chat/_context/chatbot-socket-provider'
import ChatsProvider from '@/chat/_context/chats-provider'
import ContactsProvider from '@/chat/_context/contacts-provider'
import CurrentChatProvider from '@/chat/_context/current-chat-provider'
import NewChatProvider from '@/chat/_context/new-chat-provider'
import TabProvider from '@/chat/_context/tab-provider'

const socketServerUrl = import.meta.env.VITE_SOCKET_SERVER_URL || 'ws://localhost:6001/app/{appId}'

export default function App() {
  return (
    <ThemeProvider>
      <AppConfigsProvider>
        <TabProvider>
          <ChatbotSocketProvider socketServerUrl={socketServerUrl}>
            <ContactsProvider>
              <ChatsProvider>
                <CurrentChatProvider>
                  <NewChatProvider>
                    <ChatShell />
                  </NewChatProvider>
                </CurrentChatProvider>
              </ChatsProvider>
            </ContactsProvider>
          </ChatbotSocketProvider>
        </TabProvider>
      </AppConfigsProvider>
    </ThemeProvider>
  )
}
