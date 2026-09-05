import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useMessaging } from "../MessagingContext";

// Drop this into AppSidebar (or wherever your nav lives) to link to the
// Messages page with a live unread badge. Requires MessagingProvider to
// be mounted above wherever this renders.
export default function MessagesNavIcon({ className = "" }) {
  const { totalUnread } = useMessaging();

  return (
    <Link
      to="/messages"
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-white ${className}`}
    >
      <MessageCircle size={18} />
      <span>Messages</span>
      {totalUnread > 0 && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
          {totalUnread}
        </span>
      )}
    </Link>
  );
}