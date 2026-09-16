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
      aria-label="Messages"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
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
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 shrink-0 items-center justify-end gap-1.5 border-b border-white/10 bg-[#0B0B12]/95 px-3 backdrop-blur-xl sm:gap-3 sm:px-6 lg:left-64 lg:px-8">
      <WalletChip />

      <div className="mx-0.5 h-6 w-px shrink-0 bg-white/10 sm:mx-1" />

      <NotificationBell />

      <SupportPanel />

      {FEATURES.messaging && <MessagesIconLink />}

      <div className="mx-0.5 h-6 w-px shrink-0 bg-white/10 sm:mx-1" />

      <ProfileMenu />
    </header>
  );
}
