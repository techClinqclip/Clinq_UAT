import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import WalletChip from "./WalletChip";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import SupportPanel from "./SupportPanel";
import { useMessaging } from "../messaging/MessagingContext";
import { FEATURES } from "../../config/Features";

function MessagesIconLink() {
  const { totalUnread } = useMessaging();

  return (
    <Link
      to="/messages"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
    >
      <MessageCircle size={19} />
      {totalUnread > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </Link>
  );
}

export default function TopNavbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-end gap-3 border-b border-white/10 bg-[#0B0B12]/90 px-8 backdrop-blur-xl">
      <WalletChip />

      <div className="mx-1 h-6 w-px bg-white/10" />

      <NotificationBell />
      {/* Support chat stays available regardless of FEATURES.messaging —
          it's customer support, not the social-DM feature being deferred. */}
      <SupportPanel />
      {FEATURES.messaging && <MessagesIconLink />}

      <div className="mx-1 h-6 w-px bg-white/10" />

      <ProfileMenu />
    </header>
  );
}