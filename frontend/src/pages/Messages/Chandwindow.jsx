import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Send, Phone, Video } from "lucide-react";
import { useMessaging } from "../../shared/messaging/MessagingContext";

function formatBubbleTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(ts) {
  const date = new Date(ts);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "Today";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Group consecutive messages by calendar day so the thread reads like a
// real chat app instead of one flat, undated scroll.
function groupByDay(messages) {
  const groups = [];
  let currentDay = null;
  let currentGroup = null;

  messages.forEach((msg) => {
    const day = new Date(msg.timestamp).toDateString();
    if (day !== currentDay) {
      currentDay = day;
      currentGroup = { day, label: formatDayLabel(msg.timestamp), messages: [] };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });

  return groups;
}

export default function ChatWindow() {
  const { activeChatId, conversations, getMessages, sendMessage, currentUser } = useMessaging();
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  const peer = activeChatId ? conversations[activeChatId]?.peer : null;
  const messages = activeChatId ? getMessages(activeChatId) : [];
  const dayGroups = groupByDay(messages);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeChatId]);

  if (!peer) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 bg-[#0B0B12]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          <Send size={22} className="text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-500">Select a conversation to start messaging</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(peer, text);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-[#0B0B12]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <img src={peer.avatar} alt={peer.name} className="h-10 w-10 rounded-full object-cover" />
          <div>
            <p className="text-sm font-semibold text-white">{peer.name}</p>
            <p className="text-xs text-zinc-500">@{peer.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <Phone size={17} />
          </button>
          <button type="button" className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <Video size={17} />
          </button>
          <button type="button" className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <MoreHorizontal size={17} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-6">
        {dayGroups.map((group) => (
          <div key={group.day} className="space-y-3">
            <div className="flex items-center justify-center">
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-500">
                {group.label}
              </span>
            </div>

            {group.messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-5 ${
                      isMe
                        ? "rounded-br-sm bg-violet-600 text-white"
                        : "rounded-bl-sm bg-white/10 text-zinc-100"
                    }`}
                  >
                    {msg.text}
                    <p className={`mt-1 text-[10px] ${isMe ? "text-violet-200/70" : "text-zinc-500"}`}>
                      {formatBubbleTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex shrink-0 items-center gap-3 border-t border-white/10 p-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message @${peer.username}...`}
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}