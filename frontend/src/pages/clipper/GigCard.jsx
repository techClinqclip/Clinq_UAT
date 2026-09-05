import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
    IndianRupee,
    TrendingUp,
    FileVideo,
    CalendarDays,
    ArrowRight,
    BriefcaseBusiness,
} from "lucide-react";
import {
    FaInstagram,
    FaYoutube,
    FaFacebook,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

// Self-contained on purpose: this card mirrors CampaignCard's look & feel
// but lives entirely in the gig flow, so it never needs edits to
// CampaignCard.jsx / campaignUtils.js to stay in sync.

const STATUS_STYLES = {
    Active: "bg-emerald-500/15 text-emerald-400",
    "Pending Review": "bg-amber-500/15 text-amber-400",
    Completed: "bg-violet-500/15 text-violet-400",
    Expired: "bg-red-500/15 text-red-400",
};

function normalizeString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
}

function formatMoney(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatCompact(value) {
    return new Intl.NumberFormat("en-IN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(Number(value || 0));
}

function PlatformIcon({ platform }) {
    switch (platform) {
        case "Instagram":
            return <FaInstagram className="text-pink-500" size={14} />;
        case "YouTube":
        case "YouTube Shorts":
            return <FaYoutube className="text-red-500" size={14} />;
        case "Facebook":
            return <FaFacebook className="text-blue-500" size={14} />;
        case "X":
        case "Twitter":
            return <FaXTwitter className="text-white" size={13} />;
        default:
            return null;
    }
}

function StatBox({ icon, label, value, valueClass = "text-white" }) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-zinc-500">{label}</p>
                <p className={`truncate text-base font-bold ${valueClass}`}>{value}</p>
            </div>
        </div>
    );
}

export default function GigCard({ gig }) {
    const title = normalizeString(gig?.name || gig?.title, "Untitled gig");
    const brand = normalizeString(gig?.brandName, "Brand");
    const status = normalizeString(gig?.status, "Active");
    const thumbnail = gig?.thumbnailUrl || gig?.thumbnail || gig?.image || "";

    const rewardPool = Number(gig?.rewardPool || 0);
    const usedBudget = Number(gig?.usedBudget || 0);
    const myEarnings = Number(gig?.myEarnings || 0);
    const totalSubmissions = Number(gig?.totalSubmissions || 0);
    const platforms = Array.isArray(gig?.platforms) ? gig.platforms : [];

    const progress = useMemo(
        () => (rewardPool > 0 ? Math.min(100, Math.round((usedBudget / rewardPool) * 100)) : 0),
        [rewardPool, usedBudget]
    );

    const deadlineLabel = gig?.deadline
        ? new Date(gig.deadline).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "No deadline";

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl shadow-transparent transition-all duration-300 ease-out hover:z-10 hover:-translate-y-6 hover:scale-[1.07] hover:border-violet-500/30 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] active:scale-[0.98]">
            {/* Cover */}
            <div className="relative h-36 overflow-hidden sm:h-40">
                {thumbnail ? (
                    <>
                        <img
                            src={thumbnail}
                            alt={title}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-125"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-violet-600/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-[#151520] to-[#0B0B12]" />
                        <BriefcaseBusiness
                            size={110}
                            strokeWidth={1}
                            className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
                        />
                    </>
                )}

                <div className="relative z-10 flex h-full flex-col justify-between p-4">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-medium text-violet-300">
                            <BriefcaseBusiness size={12} />
                            Gig
                        </span>
                        <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[status] || "bg-zinc-500/15 text-zinc-300"}`}
                        >
                            {status}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-300">{brand}</p>
                        <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">{title}</h3>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-5">
                <StatBox
                    icon={<IndianRupee size={15} className="text-violet-400" />}
                    label="Reward Pool"
                    value={formatMoney(rewardPool)}
                />
                <StatBox
                    icon={<TrendingUp size={15} className="text-emerald-400" />}
                    label="My Earnings"
                    value={formatMoney(myEarnings)}
                    valueClass="text-emerald-400"
                />
                <StatBox
                    icon={<FileVideo size={15} className="text-violet-400" />}
                    label="Submissions"
                    value={`${formatCompact(totalSubmissions)} Clips`}
                />
                <StatBox
                    icon={<CalendarDays size={15} className="text-violet-400" />}
                    label="Deadline"
                    value={deadlineLabel}
                />
            </div>

            {/* Platforms */}
            {platforms.length > 0 && (
                <div className="flex items-center gap-2 px-5 pb-1">
                    {platforms.map((platform) => (
                        <div
                            key={platform}
                            title={platform}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]"
                        >
                            <PlatformIcon platform={platform} />
                        </div>
                    ))}
                </div>
            )}

            {/* Budget progress */}
            <div className="px-5 pb-5 pt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                        {formatMoney(usedBudget)} of {formatMoney(rewardPool)} used
                    </span>
                    <span className="font-semibold text-white">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Mobile/touch CTA: stays in normal flow, no hover on touch */}
            <div className="border-t border-white/5 p-5 pt-5 lg:hidden">
                <Link
                    to={`/clipper/gigs/${gig.accessKey}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-violet-500"
                >
                    Open Gig
                    <ArrowRight size={16} />
                </Link>
            </div>

            {/* Desktop CTA: slides up on hover, doesn't grow the card's box height */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto lg:block">
                <div className="border-t border-white/10 bg-[#11111A]/95 p-5 backdrop-blur-sm">
                    <Link
                        to={`/clipper/gigs/${gig.accessKey}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-violet-500"
                    >
                        Open Gig
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}