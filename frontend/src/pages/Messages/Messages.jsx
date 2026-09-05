import { MessagingProvider } from "../../shared/messaging/Messagingcontext";
import MessagesLayout from "./MessagesLayout";
import ChatList from "./Chatlist";
import ChatWindow from "./Chandwindow";

function MessagesBody() {
  return (
    <div className="flex h-full">
      <ChatList />
      <ChatWindow />
    </div>
  );
}

export default function Messages() {
  return (
    // NOTE: MessagingProvider is wrapped here so this page works standalone.
    // Once routing is in place, hoist MessagingProvider (and this import)
    // up to your App.jsx root, above the router, so the SAME conversation
    // state is shared between Community, Leaderboard, and this page —
    // right now each page mounts its own isolated provider.
    <MessagingProvider>
      <MessagesLayout>
        <MessagesBody />
      </MessagesLayout>
    </MessagingProvider>
  );
}