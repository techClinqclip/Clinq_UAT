import { useNavigate, Link } from "react-router-dom";
import {
    Eye,
    Wallet,
    CalendarDays,
    Clapperboard,
    MessageSquareWarning,
    ArrowRight,
    Shirt,
    Trophy,
    Mic2,
    Smartphone,
    Palette,
    Film,
    Sparkles,
    GraduationCap,
    IndianRupee,
    BadgeCheck,
} from "lucide-react";

// Self-contained on purpose — same visual language as GigCard/CampaignCard,
// but scoped to the creator submissions flow (no shared imports to keep in sync).

const STATUS_STYLES = {
    Pending: "bg-yellow-500/15 text-yellow-400",
    Approved: "bg-green-500/15 text-green-400",
    Active: "bg-green-500/15 text-green-400",
    Paused: "bg-amber-500/15 text-amber-300",
    Closed: "bg-zinc-500/15 text-zinc-300",
    Rejected: "bg-red-500/15 text-red-400",
    Paid: "bg-violet-500/15 text-violet-400",
};

const STATUS_TEXT_STYLES = {
    Pending: "text-yellow-400",
    Approved: "text-green-400",
    Active: "text-green-400",
    Paused: "text-amber-300",
    Closed: "text-zinc-300",
    Rejected: "text-red-400",
    Paid: "text-violet-400",
};

// Until the API sends a real campaign thumbnail, fall back to something
// that at least reflects what the campaign is about, same idea as
// CampaignCard's CATEGORY_ICONS.
const CATEGORY_ICONS = {
    fashion: Shirt,
    gaming: Trophy,
    music: Mic2,
    tech: Smartphone,
    art: Palette,
    entertainment: Film,
    education: GraduationCap,
    finance: IndianRupee,
    lifestyle: Sparkles,
    default: Clapperboard,
};

function formatCompact(value) {
    return new Intl.NumberFormat("en-IN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(Number(value || 0));
}

function StatBox({ icon, label, value, valueClass = "text-white" }) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                {icon}
            </div>
            {/* min-w-0 lets the flex child shrink; no `truncate` here on
                purpose — these values are short (dates, ₹ amounts, view
                counts) and truncating was clipping "Not specified" / dates
                into "..." on narrower cards. */}
            <div className="min-w-0">
                <p className="text-[11px] text-zinc-500">{label}</p>
                <p className={`truncate text-base font-bold ${valueClass}`}>{value}</p>
            </div>
        </div>
    );
}

export default function SubmissionCard({ submission }) {
    const navigate = useNavigate();
    const status = submission?.status || "Pending";
    const submittedLabel = submission?.submittedAt || "Not specified";
    const thumbnail = submission?.thumbnailUrl || submission?.thumbnail || submission?.image || "";
    const categoryKey = String(submission?.category || "").toLowerCase();
    const CategoryIcon = CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.default;

    const open = () => navigate(`/creator/submissions/${submission.id}`);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            }}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl shadow-transparent transition-all duration-300 ease-out hover:z-10 hover:-translate-y-6 hover:scale-[1.07] hover:border-violet-500/30 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.98]"
        >
            {/* Cover — mirrors GigCard: real thumbnail if we have one, gradient + icon if not */}
            <div className="relative h-36 overflow-hidden sm:h-40">
                {thumbnail ? (
                    <>
                        <img
                            src={thumbnail}
                            alt={submission.title}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-125"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-violet-600/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-[#151520] to-[#0B0B12]" />
                        <CategoryIcon
                            size={110}
                            strokeWidth={1}
                            className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
                        />
                    </>
                )}

                <div className="relative z-10 flex h-full flex-col justify-between p-4">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-medium text-violet-300">
                            <CategoryIcon size={12} />
                            {submission?.category ? submission.category.replace(/_/g, " ") : "Content"}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-300">{submission.brand}</p>
                        <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">{submission.title}</h3>
                    </div>
                </div>
            </div>

            {/* Rejection feedback */}
            {status === "Rejected" && submission.feedback && (
                <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-zinc-300">
                    <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-red-400" />
                    {submission.feedback}
                </div>
            )}

            {/* Stats — exact 2x2 grid layout from GigCard */}
            <div className="grid grid-cols-2 gap-3 p-5">
                <StatBox
                    icon={<Wallet size={15} className="text-emerald-400" />}
                    label="Reward"
                    value={submission.reward}
                    valueClass="text-emerald-400"
                />
                <StatBox
                    icon={<Eye size={15} className="text-violet-400" />}
                    label="Views"
                    value={formatCompact(submission.views)}
                />
                <StatBox
                    icon={<BadgeCheck size={15} className="text-violet-400" />}
                    label="Status"
                    value={status}
                    valueClass={STATUS_TEXT_STYLES[status] || "text-zinc-300"}
                />
                <StatBox
                    icon={<CalendarDays size={15} className="text-violet-400" />}
                    label="Submitted"
                    value={submittedLabel}
                />
            </div>

            {/* Mobile/touch CTA: stays in normal flow, no hover on touch */}
            <div className="border-t border-white/5 p-5 pt-5 lg:hidden">
                <Link
                    to={`/creator/submissions/${submission.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-violet-500"
                >
                    View Submission
                    <ArrowRight size={16} />
                </Link>
            </div>

            {/* Desktop CTA: slides up on hover, doesn't grow the card's box height */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto lg:block">
                <div className="border-t border-white/10 bg-[#11111A]/95 p-5 backdrop-blur-sm">
                    <Link
                        to={`/creator/submissions/${submission.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-violet-500"
                    >
                        View Submission
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}