import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seedConversations } from "./Messagingseeddata";

const MessagingContext = createContext(null);

export const currentUser = {
  id: "u_me",
  name: "You",
  username: "you",
  avatar: "https://i.pravatar.cc/200?img=68",
};

// Mock auto-reply so the demo feels alive. Remove this block once a real
// backend/websocket is wired up — sendMessage() below is the only place
// that needs to change to go live.
const DEMO_AUTO_REPLIES = [
  "Hey! Thanks for reaching out 👋",
  "Got it, I'll take a look.",
  "Appreciate you flagging this!",
  "On it — give me a bit.",
];

export function MessagingProvider({ children }) {
  // conversations: { [peerId]: { peer: {id,name,username,avatar}, messages: Message[], lastReadAt: number } }
  const [conversations, setConversations] = useState(seedConversations);
  const [activeQuickMessageUser, setActiveQuickMessageUser] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const replyTimers = useRef({});

  const openQuickMessage = (user) => setActiveQuickMessageUser(user);
  const closeQuickMessage = () => setActiveQuickMessageUser(null);

  const openChat = (userId) => setActiveChatId(userId);

  const markRead = (userId) => {
    setConversations((prev) => {
      if (!prev[userId]) return prev;
      return { ...prev, [userId]: { ...prev[userId], lastReadAt: Date.now() } };
    });
  };

  // Mark read whenever a conversation becomes the active one — whether
  // that's the quick-message widget or the full Messages page.
  useEffect(() => {
    if (activeQuickMessageUser?.id) markRead(activeQuickMessageUser.id);
  }, [activeQuickMessageUser?.id]);

  useEffect(() => {
    if (activeChatId) markRead(activeChatId);
  }, [activeChatId]);

  const getMessages = (userId) => conversations[userId]?.messages || [];

  const getUnreadCount = (userId) => {
    const convo = conversations[userId];
    if (!convo) return 0;
    return convo.messages.filter((m) => m.senderId !== currentUser.id && m.timestamp > convo.lastReadAt).length;
  };

  const sendMessage = (user, text) => {
    const trimmed = text.trim();
    if (!trimmed || !user?.id) return;

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderId: currentUser.id,
      text: trimmed,
      timestamp: Date.now(),
    };

    setConversations((prev) => {
      const existing = prev[user.id];
      return {
        ...prev,
        [user.id]: {
          peer: user,
          messages: [...(existing?.messages || []), message],
          lastReadAt: Date.now(),
        },
      };
    });

    // --- Demo-only simulated reply. Delete when wiring a real backend. ---
    clearTimeout(replyTimers.current[user.id]);
    replyTimers.current[user.id] = setTimeout(() => {
      const reply = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: user.id,
        text: DEMO_AUTO_REPLIES[Math.floor(Math.random() * DEMO_AUTO_REPLIES.length)],
        timestamp: Date.now(),
      };
      setConversations((prev) => {
        const existing = prev[user.id];
        return {
          ...prev,
          [user.id]: {
            peer: existing?.peer || user,
            messages: [...(existing?.messages || []), reply],
            lastReadAt: existing?.lastReadAt ?? 0,
          },
        };
      });
    }, 1100);
  };

  const conversationList = useMemo(() => {
    return Object.values(conversations)
      .filter((c) => c.messages.length > 0)
      .sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.timestamp || 0;
        const bLast = b.messages[b.messages.length - 1]?.timestamp || 0;
        return bLast - aLast;
      });
  }, [conversations]);

  const totalUnread = useMemo(() => {
    return Object.keys(conversations).reduce((sum, id) => sum + getUnreadCount(id), 0);
  }, [conversations]);

  const value = {
    currentUser,
    conversations,
    conversationList,
    getMessages,
    getUnreadCount,
    totalUnread,
    sendMessage,
    activeQuickMessageUser,
    openQuickMessage,
    closeQuickMessage,
    activeChatId,
    openChat,
    markRead,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error("useMessaging must be used inside MessagingProvider");
  return ctx;
}
