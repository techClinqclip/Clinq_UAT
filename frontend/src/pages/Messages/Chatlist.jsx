import { useState } from "react";
import { Search, MessageSquarePlus } from "lucide-react";
import { useMessaging } from "../../shared/messaging/MessagingContext";

function formatListTime(ts) {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString();
}

export default function ChatList() {
  const { conversationList, activeChatId, openChat, getUnreadCount, currentUser } = useMessaging();
  const [query, setQuery] = useState("");

  const filtered = conversationList.filter(({ peer }) =>
    peer.name.toLowerCase().includes(query.toLowerCase()) ||
    peer.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex h-full w-full max-w-sm shrink-0 flex-col border-r border-white/10 bg-[#0E0E15]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <h1 className="text-xl font-bold text-white">Messages</h1>
        <button
          type="button"
          className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
          title="New message"
        >
          <MessageSquarePlus size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-white/5 p-4">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map(({ peer, messages }) => {
            const lastMessage = messages[messages.length - 1];
            const unread = getUnreadCount(peer.id);
            const isActive = activeChatId === peer.id;
            const isMe = lastMessage?.senderId === currentUser.id;

            return (
              <button
                key={peer.id}
                type="button"
                onClick={() => openChat(peer.id)}
                className={`flex w-full items-center gap-3 border-b border-white/5 p-4 text-left transition ${
                  isActive ? "bg-violet-500/10" : "hover:bg-white/[0.03]"
                }`}
              >
                <img src={peer.avatar} alt={peer.name} className="h-11 w-11 shrink-0 rounded-full object-cover" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${unread > 0 ? "font-semibold text-white" : "font-medium text-zinc-200"}`}>
                      {peer.name}
                    </p>
                    {lastMessage && (
                      <span className="shrink-0 text-[11px] text-zinc-500">{formatListTime(lastMessage.timestamp)}</span>
                    )}
                  </div>
                  <p className={`truncate text-xs ${unread > 0 ? "text-zinc-300" : "text-zinc-500"}`}>
                    {isMe && <span className="text-zinc-600">You: </span>}
                    {lastMessage?.text}
                  </p>
                </div>

                {unread > 0 && (
                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
            <p className="text-sm text-zinc-500">
              {query ? "No conversations match your search." : "No conversations yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}