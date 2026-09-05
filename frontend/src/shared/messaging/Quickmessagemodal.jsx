import { useEffect, useRef, useState } from "react";
import { X, Send, Minus, Headphones } from "lucide-react";
import { useMessaging } from "./MessagingContext";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// Small header avatar with graceful fallbacks: support gets a branded
// headset badge, everyone else falls back to initials if no photo exists.
function HeaderAvatar({ user, size = 32 }) {
  const style = { width: size, height: size };

  if (user.isSupport) {
    return (
      <div
        style={style}
        className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"
      >
        <Headphones size={size * 0.5} className="text-white" />
      </div>
    );
  }

  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} style={style} className="shrink-0 rounded-full object-cover" />;
  }

  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 font-semibold text-white"
    >
      <span style={{ fontSize: size * 0.35 }}>{initials(user.name)}</span>
    </div>
  );
}

export default function QuickMessageModal() {
  const { activeQuickMessageUser, closeQuickMessage, getMessages, sendMessage, currentUser } = useMessaging();
  const [text, setText] = useState("");
  const [minimized, setMinimized] = useState(false);
  const scrollRef = useRef(null);

  const messages = activeQuickMessageUser ? getMessages(activeQuickMessageUser.id) : [];

  useEffect(() => {
    setMinimized(false);
    setText("");
  }, [activeQuickMessageUser?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, minimized]);

  if (!activeQuickMessageUser) return null;
  const user = activeQuickMessageUser;

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(user, text);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#15151F] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <HeaderAvatar user={user} size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">
              {user.isSupport ? "Usually replies within a few hours" : `@${user.username}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized((v) => !v)}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={closeQuickMessage}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex h-80 flex-col gap-2 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="text-sm text-zinc-500">Say hi to {user.name.split(" ")[0]} 👋</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        isMe
                          ? "rounded-br-sm bg-violet-600 text-white"
                          : "rounded-bl-sm bg-white/10 text-zinc-100"
                      }`}
                    >
                      {msg.text}
                      <p className={`mt-1 text-[10px] ${isMe ? "text-violet-200/70" : "text-zinc-500"}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-white/10 p-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}