import { useEffect, useRef, useState } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Trophy, CheckCircle2 } from "lucide-react";
import { useNotifications } from "../notifications/NotificationContext";

const ICONS = {
  like: { icon: Heart, className: "text-rose-400" },
  comment: { icon: MessageCircle, className: "text-sky-400" },
  follow: { icon: UserPlus, className: "text-violet-400" },
  rank: { icon: Trophy, className: "text-amber-400" },
  submission: { icon: CheckCircle2, className: "text-emerald-400" },
  "support.ticket_response": { icon: MessageCircle, className: "text-sky-400" },
  "content.campaign_published": { icon: CheckCircle2, className: "text-emerald-400" },
  "content.joined_campaign_changed": { icon: MessageCircle, className: "text-amber-400" },
  "content.joined_campaign_closed": { icon: CheckCircle2, className: "text-rose-400" },
  "earnings.withdrawal_requested": { icon: CheckCircle2, className: "text-amber-400" },
  "earnings.withdrawal_status": { icon: CheckCircle2, className: "text-amber-400" },
  "earnings.payment_received": { icon: CheckCircle2, className: "text-emerald-400" },
  "earnings.pending_payout_approved": { icon: CheckCircle2, className: "text-emerald-400" },
};

function formatTime(ts) {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const unseenNotifications = notifications.filter((notification) => !notification.read);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#15151F] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-violet-400 transition hover:text-violet-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {unseenNotifications.length > 0 ? (
              unseenNotifications.map((n) => {
                const meta = ICONS[n.type] || ICONS.like;
                const Icon = meta.icon;

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 p-4 text-left transition hover:bg-white/[0.03] ${
                      !n.read ? "bg-violet-500/[0.04]" : ""
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 ${meta.className}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 text-zinc-200">
                        <span className="font-semibold text-white">{n.actor.name}</span> {n.text}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{formatTime(n.timestamp)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />}
                  </button>
                );
              })
            ) : (
              <p className="py-10 text-center text-sm text-zinc-500">You're all caught up.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}