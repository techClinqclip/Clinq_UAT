import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    CircleDollarSign,
    Wallet,
    Hourglass,
    Send,
    CheckCircle2,
    Clock3,
    XCircle,
    AlertTriangle,
    Trophy,
    Ban,
    ExternalLink,
    Trash2,
    Video,
    FileText,
    FolderArchive,
} from "lucide-react";
import { FaInstagram, FaYoutube, FaFacebook, FaXTwitter } from "react-icons/fa6";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast";
import ConfirmModal from "./components/ConfirmModal";
import SubmitClipDialog from "../Creator/SubmitClipDialog";
import { api } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";

/*
  Campaign-state gating: a campaign can stop accepting submissions for three
  independent reasons — the reward pool ran out, this clipper personally hit
  their earnings cap, or the brand closed the campaign outright / never gave
  it a status. getCampaignNotice() below is the single source of truth for
  which (if any) banner shows and whether "Submit Clip" is disabled, so the
  hero button and the banner can never disagree with each other.
*/

const fallbackGig = {
    id: null,
    name: "Gig not found",
    title: "Gig not found",
    creator: "Unknown",
    status: "Unavailable",
    description: "This gig could not be loaded.",
    rewardPool: 0,
    usedBudget: 0,
    myEarnings: 0,
    pendingPayout: 0,
    deadline: null,
    earningRate: "—",
    maxCreatorEarnings: 0,
    requirements: [],
    performance: {
        submitted: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
    },
};

// Solid, brand-accurate badge colors — icon sits in a filled square rather
// than a faint tint, so platforms read at a glance the way they do in-app.
const PLATFORM_ICONS = {
    instagram: { icon: FaInstagram, badge: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600" },
    youtube: { icon: FaYoutube, badge: "bg-red-600" },
    facebook: { icon: FaFacebook, badge: "bg-blue-600" },
    twitter: { icon: FaXTwitter, badge: "bg-black border border-white/20" },
    x: { icon: FaXTwitter, badge: "bg-black border border-white/20" },
};

// Indian-style currency shorthand: thousand -> k, lakh -> L, crore -> Cr
function formatINR(value) {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return "₹0";
    const sign = num < 0 ? "-" : "";
    const abs = Math.abs(num);

    const trim = (n) => {
        const fixed = n.toFixed(2);
        return fixed.replace(/\.?0+$/, "");
    };

    if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
    if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`;
    return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

// Small donut gauge used for "earnings vs. cap" — plain numbers don't make
// how close a clipper is to the payout ceiling obvious at a glance.
function CircularProgress({ percentage, size = 72, strokeWidth = 7, colorClass = "stroke-emerald-400" }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(Math.max(percentage, 0), 100);
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
                className="stroke-white/10"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={`${colorClass} transition-all duration-500`}
            />
        </svg>
    );
}

function BudgetRing({ percent = 0 }) {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const radius = 62;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (safePercent / 100) * circumference;

    const ringColor =
        safePercent >= 90 ? "#f87171" : safePercent >= 65 ? "#fbbf24" : "#8b5cf6";

    return (
        <div className="relative flex h-40 w-40 items-center justify-center">
            <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
                <defs>
                    <linearGradient id="clipperBudgetRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={ringColor} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={ringColor} stopOpacity="1" />
                    </linearGradient>
                </defs>
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="url(#clipperBudgetRingGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
                        filter: `drop-shadow(0 0 6px ${ringColor}80)`,
                    }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-white">{safePercent}%</span>
                <span className="mt-1 text-xs text-zinc-500">Used Budget</span>
            </div>
        </div>
    );
}

const STATUS_STYLES = {
    Approved: "bg-emerald-500/10 text-emerald-400",
    Pending: "bg-yellow-500/10 text-yellow-400",
    Rejected: "bg-red-500/10 text-red-400",
};

// Single source of truth for whether submissions are still accepted, and why.
function getCampaignNotice(gig) {
    const usedBudget = Number(gig?.usedBudget || 0);
    const rewardPool = Number(gig?.rewardPool || 0);
    const myEarnings = Number(gig?.myEarnings || 0);
    const maxCreatorEarnings = Number(gig?.maxCreatorEarnings || 0);

    const budgetExhausted = rewardPool > 0 && usedBudget >= rewardPool;
    const capReached = maxCreatorEarnings > 0 && myEarnings >= maxCreatorEarnings;
    const campaignClosed = !gig?.status || gig.status !== "Active";

    if (budgetExhausted) {
        return {
            blocked: true,
            tone: "danger",
            icon: AlertTriangle,
            title: "Reward Pool Exhausted",
            message:
                "The campaign has reached its maximum reward pool. No more submissions are being accepted.",
        };
    }

    if (capReached) {
        return {
            blocked: true,
            tone: "warning",
            icon: Trophy,
            title: "Maximum Creator Earnings Reached",
            message: `You've reached ${formatINR(gig.maxCreatorEarnings)}. Further submissions won't generate rewards.`,
        };
    }

    if (campaignClosed) {
        return {
            blocked: true,
            tone: "muted",
            icon: Ban,
            title: "Campaign Closed",
            message: "This campaign has ended.",
        };
    }

    return { blocked: false };
}

const NOTICE_STYLES = {
    danger: { border: "border-red-500/20", bg: "bg-red-500/5", iconBg: "bg-red-500/10", iconText: "text-red-400" },
    warning: { border: "border-amber-500/20", bg: "bg-amber-500/5", iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
    muted: { border: "border-white/10", bg: "bg-white/[0.02]", iconBg: "bg-white/5", iconText: "text-zinc-400" },
};

export default function ClipperGigDetails() {
    const { id: accessKey } = useParams();
    const currentUser = useCurrentUser();
    const [joinedGigs, setJoinedGigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submissionList, setSubmissionList] = useState([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(true);

    const gig = useMemo(() => {
        const selected = joinedGigs.find((item) => item.accessKey === accessKey);
        return selected || fallbackGig;
    }, [joinedGigs, accessKey]);

    // Load the gig itself.
    useEffect(() => {
        let mounted = true;

        const loadGig = async () => {
            try {
                const data = await api(`/api/content/campaigns/${accessKey}/joined-gig/`);
                if (!mounted) return;
                setJoinedGigs(Array.isArray(data) ? data : [data]);
            } catch (error) {
                console.error("Failed to load clipper gig details", error);
                try {
                    const listData = await api("/api/content/campaigns/clipper-gigs/");
                    if (!mounted) return;
                    setJoinedGigs(Array.isArray(listData) ? listData : []);
                } catch {
                    if (mounted) setJoinedGigs([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadGig();
        return () => {
            mounted = false;
        };
    }, [accessKey, currentUser?.id]);

    // Load this gig's submissions once the gig itself has resolved.
    useEffect(() => {
        let mounted = true;

        const loadSubmissionsAfterGig = async () => {
            setSubmissionsLoading(true);
            try {
                const allUserSubmissions = await api(`/api/content/clipper-submissions/?campaign=${encodeURIComponent(accessKey)}`);
                const rows = Array.isArray(allUserSubmissions) ? allUserSubmissions : [];

                if (!mounted) return;
                setSubmissionList(rows.map((item) => ({
                    id: item.id,
                    campaign: item.campaign || item.name || "Campaign",
                    title: item.handle || item.platformUsername || `Submission ${item.id}`,
                    username: item.handle || item.platformUsername || item.username || "",
                    platform: String(item.platform || "instagram").toLowerCase(),
                    postUrl: item.contentUrl || item.url || "",
                    views: String(item.views ?? "0"),
                    status: String(item.status || "Pending"),
                    earnings: Number(item.earned ?? item.earning ?? 0),
                    pendingPayout: Number(item.pendingPayout ?? item.pendingEarning ?? 0),
                })));
            } catch (error) {
                console.error("Failed to load gig submissions after gig load", error);
                if (mounted) setSubmissionList([]);
            } finally {
                if (mounted) setSubmissionsLoading(false);
            }
        };

        if (gig?.id && gig?.name && gig.name !== "Gig not found") {
            loadSubmissionsAfterGig();
        } else if (!loading) {
            // Gig genuinely doesn't exist / failed to load — don't spin forever.
            setSubmissionsLoading(false);
        }

        return () => {
            mounted = false;
        };
    }, [accessKey, currentUser?.id, gig?.id, gig?.name, loading]);

    const budgetPercentage = Number(gig?.rewardPool || 0) > 0
        ? Math.round((Number(gig?.usedBudget || 0) / Number(gig?.rewardPool || 0)) * 100)
        : 0;

    const earningsPercentage = Number(gig?.maxCreatorEarnings || 0) > 0
        ? Math.min(Math.round((Number(gig?.myEarnings || 0) / Number(gig?.maxCreatorEarnings || 0)) * 100), 100)
        : 0;
    const earningsColor =
        earningsPercentage >= 100
            ? "stroke-red-400"
            : earningsPercentage >= 80
                ? "stroke-amber-400"
                : "stroke-emerald-400";

    const notice = getCampaignNotice(gig);

    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = (submission) => {
        setSelectedSubmission(submission);
        setShowDeleteModal(true);
    };

    const { showToast } = useToast();
    const confirmDelete = async () => {
        if (!selectedSubmission?.id) {
            setShowDeleteModal(false);
            setSelectedSubmission(null);
            return;
        }

        try {
            await api(`/api/content/clipper-submissions/${selectedSubmission.id}/`, {
                method: "DELETE",
            });

            setSubmissionList((prev) =>
                prev.filter((item) => item.id !== selectedSubmission.id)
            );

            showToast({
                type: "success",
                title: "Submission Deleted",
                message: `"${selectedSubmission.title}" has been deleted. The 24-hour cooling period still applies.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "Delete Failed",
                message: error.message || "Unable to delete submission.",
            });
        } finally {
            setShowDeleteModal(false);
            setSelectedSubmission(null);
        }
    };
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <div className="h-5 w-40 animate-pulse rounded bg-white/10" />

                <div className="mt-8 h-9 w-32 animate-pulse rounded bg-white/10" />

                {/* Hero skeleton */}
                <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl flex-1">
                            <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
                            <div className="mt-5 h-10 w-3/4 animate-pulse rounded bg-white/10" />
                            <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/10" />
                            <div className="mt-6 space-y-2">
                                <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                                <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                            </div>
                        </div>
                        <div className="h-12 w-36 animate-pulse rounded-xl bg-white/10" />
                    </div>

                    <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-white/10 bg-black/30 p-5">
                                <div className="mb-3 h-6 w-6 animate-pulse rounded bg-white/10" />
                                <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                                <div className="mt-3 h-6 w-20 animate-pulse rounded bg-white/10" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Performance + Budget skeleton */}
                <section className="mt-8 grid gap-8 lg:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                        <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
                        <div className="mt-8 grid grid-cols-2 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="rounded-2xl bg-black/30 p-5">
                                    <div className="mb-3 h-6 w-6 animate-pulse rounded bg-white/10" />
                                    <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                                    <div className="mt-3 h-7 w-10 animate-pulse rounded bg-white/10" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                        <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
                        <div className="mt-10">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                                <div className="h-4 w-10 animate-pulse rounded bg-white/10" />
                            </div>
                            <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                            <div className="mt-5 h-4 w-48 animate-pulse rounded bg-white/10" />
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    const gigTitle = gig?.name || gig?.title || "Gig detail";
    const gigCreator = gig?.brandName || gig?.creator || "Unknown brand";
    const gigDescription = gig?.description || "No description provided.";
    const requirements = Array.isArray(gig?.requirements) ? gig.requirements : [];
    const resources = Array.isArray(gig?.resources) ? gig.resources : [];

    const handleSubmitClip = async ({ platform, username, url }) => {
        try {
            const response = await api(`/api/content/campaigns/${gig.id}/submit-clip/`, {
                method: "POST",
                body: { platform, username, url },
            });
    
            const createdSubmission = response?.submission || {
                id: `SUB-${String(submissionList.length + 1).padStart(3, "0")}`,
                campaign: gig?.name || gig?.title || "Campaign",
                platform,
                platformUsername: username,
                contentUrl: url,
                status: "Pending",
                earning: 0,
                pendingEarning: 0,
            };
    
            setSubmissionList((prev) => [{
                id: createdSubmission.id,
                campaign: createdSubmission.campaign || gig?.name || gig?.title || "Campaign",
                title: createdSubmission.platformUsername || username || "Submission",
                username: createdSubmission.platformUsername || username || "",
                platform: String(createdSubmission.platform || platform || "instagram").toLowerCase(),
                postUrl: createdSubmission.contentUrl || url,
                views: String(createdSubmission.views ?? "0"),
                status: String(createdSubmission.status || "Pending"),
                earnings: Number(createdSubmission.earning ?? 0),
                pendingPayout: Number(createdSubmission.pendingEarning ?? 0),
            }, ...prev]);
    
            setShowSubmitDialog(false);
            showToast({
                type: "success",
                title: "Clip Submitted",
                message: response?.message || "Your clip was submitted and is awaiting review.",
            });
        } catch (error) {
            // Don't swallow this — let SubmitClipDialog's own catch handle the
            // toast + stop its processing modal from showing a fake "done".
            throw error;
        }
    };
    return (
        <div className="min-h-screen bg-black text-white">

            {/* Back */}
            <Breadcrumbs
                overrides={{
                    Gig: gigTitle,
                }}
            />

            <Link
                to="/clipper/gigs"
                className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
                <ArrowLeft size={18} />
                Back to My Gigs
            </Link>

            {/* Hero */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">

                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">

                    <div className="max-w-3xl">

                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-4xl font-bold">
                                {gigTitle}
                            </h1>
                            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                {gig?.status || "Unavailable"}
                            </span>
                        </div>

                        <p className="mt-3 text-zinc-400">
                            by {gigCreator}
                        </p>
                    </div>

                    <button
                        disabled={notice.blocked}
                        title={notice.blocked ? notice.title : undefined}
                        onClick={() => setShowSubmitDialog(true)}
                        className={`rounded-xl px-6 py-3 font-medium transition ${
                            notice.blocked
                                ? "cursor-not-allowed bg-white/5 text-zinc-500"
                                : "bg-violet-600 hover:bg-violet-500"
                        }`}
                    >
                        Submit Clip
                    </button>

                </div>

                {/* Campaign notice — only one of these ever shows */}
                {notice.blocked && (
                    <div
                        className={`mt-8 flex items-start gap-3 rounded-2xl border p-5 ${NOTICE_STYLES[notice.tone].border} ${NOTICE_STYLES[notice.tone].bg}`}
                    >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${NOTICE_STYLES[notice.tone].iconBg}`}>
                            <notice.icon size={16} className={NOTICE_STYLES[notice.tone].iconText} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{notice.title}</p>
                            <p className="mt-1 text-sm text-zinc-400">{notice.message}</p>
                        </div>
                    </div>
                )}

                {/* Hero Stats */}

                <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <CircleDollarSign className="mb-3 text-violet-400" />
                        <p className="text-sm text-zinc-500">
                            Campaign Budget
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold">
                            {formatINR(gig?.rewardPool)}
                        </h3>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <Wallet className="mb-3 text-emerald-400" />
                        <p className="text-sm text-zinc-500">
                            My Earnings
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold">
                            {formatINR(gig?.myEarnings)}
                        </h3>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <Hourglass className="mb-3 text-sky-400" />
                        <p className="text-sm text-zinc-500">
                            Pending Payout
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold">
                            {formatINR(gig?.pendingPayout)}
                        </h3>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <CalendarDays className="mb-3 text-orange-400" />
                        <p className="text-sm text-zinc-500">
                            Deadline
                        </p>
                        <h3 className="mt-2 text-lg font-semibold">
                            {gig?.deadline ? new Date(gig.deadline).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            }) : "No deadline"}
                        </h3>
                    </div>

                </div>

            </section>

            {/* Performance + Budget */}

            <section className="mt-8 grid gap-8 lg:grid-cols-2">

                {/* My Performance */}

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">

                    <h2 className="text-xl font-semibold">
                        My Performance
                    </h2>

                    <div className="mt-8 grid grid-cols-2 gap-6">

                        <div className="rounded-2xl bg-black/30 p-5">
                            <Send className="mb-3 text-violet-400" />
                            <p className="text-sm text-zinc-500">
                                Submitted
                            </p>
                            <h3 className="mt-2 text-3xl font-bold">
                                {gig?.performance?.submitted ?? 0}
                            </h3>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-5">
                            <CheckCircle2 className="mb-3 text-emerald-400" />
                            <p className="text-sm text-zinc-500">
                                Approved
                            </p>
                            <h3 className="mt-2 text-3xl font-bold">
                                {gig?.performance?.approved ?? 0}
                            </h3>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-5">
                            <Clock3 className="mb-3 text-yellow-400" />
                            <p className="text-sm text-zinc-500">
                                Pending
                            </p>
                            <h3 className="mt-2 text-3xl font-bold">
                                {gig?.performance?.pending ?? 0}
                            </h3>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-5">
                            <XCircle className="mb-3 text-red-400" />
                            <p className="text-sm text-zinc-500">
                                Rejected
                            </p>
                            <h3 className="mt-2 text-3xl font-bold">
                                {gig?.performance?.rejected ?? 0}
                            </h3>
                        </div>

                    </div>

                </div>

                {/* Budget */}

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">

                    <h2 className="text-xl font-semibold">
                        Budget Utilization
                    </h2>

                    <div className="mt-8 flex flex-col items-center text-center">

                        <BudgetRing percent={budgetPercentage} />

                        <p className="mt-4 text-sm text-zinc-400">
                            {formatINR(gig?.usedBudget)} used of {formatINR(gig?.rewardPool)}
                        </p>

                    </div>

                </div>

            </section>

            {/* Campaign Information */}

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7">

                <h2 className="text-xl font-semibold">
                    Campaign Information
                </h2>

                <div className="mt-6">
                    <p className="text-sm font-medium text-zinc-400">Description</p>
                    <p className="mt-2 leading-7 text-zinc-300">{gigDescription}</p>
                </div>

                <div className="mt-6">
                    <p className="text-sm font-medium text-zinc-400">Requirements</p>
                    <ul className="mt-2 space-y-2 text-zinc-300">
                        {requirements.length > 0 ? requirements.map((req, i) => (
                            <li key={i}>• {req}</li>
                        )) : (
                            <li>No requirements listed.</li>
                        )}
                    </ul>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-black/30 p-5">
                        <p className="text-sm text-zinc-500">Earning Rate</p>
                        <h3 className="mt-2 text-lg font-semibold">
                            {gig?.earningRate && gig.earningRate !== "—"
                                ? `You earn ${gig.earningRate} on this campaign.`
                                : "—"}
                        </h3>
                    </div>

                    <div className="flex items-center gap-5 rounded-2xl bg-black/30 p-5">
                        <div className="relative shrink-0">
                            <CircularProgress percentage={earningsPercentage} colorClass={earningsColor} />
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                {earningsPercentage}%
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Your Earnings vs. Cap</p>
                            <h3 className="mt-1 text-lg font-semibold">
                                {formatINR(gig?.myEarnings)}
                                <span className="text-sm font-normal text-zinc-500">
                                    {" "}/ {formatINR(gig?.maxCreatorEarnings)}
                                </span>
                            </h3>
                        </div>
                    </div>
                </div>

            </section>

            {/* Resources */}

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7">

                <div className="flex items-center justify-between">

                    <h2 className="text-xl font-semibold">
                        Resources
                    </h2>

                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">

                    <table className="min-w-full">

                        <thead className="bg-[#11111A]/95">
                            <tr className="border-b border-white/10">
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    Resource
                                </th>
                                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    Link
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {resources.length > 0 ? resources.map((resource, index) => {
                                const ResourceIcon = resource.url?.includes("drive.google.com") || resource.name?.toLowerCase().includes("video")
                                    ? Video
                                    : resource.url?.includes("notion") || resource.name?.toLowerCase().includes("guideline")
                                        ? FileText
                                        : FolderArchive;

                                return (
                                    <tr
                                        key={resource.id ?? `${resource.name}-${index}`}
                                        className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
                                    >
                                        <td className="px-5 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                                                    <ResourceIcon size={16} className="text-violet-400" />
                                                </div>
                                                <p className="font-medium">
                                                    {resource.name || "Campaign resource"}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-5 text-right">
                                            <a
                                                href={resource.url || "#"}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                                            >
                                                Open Link
                                                <ExternalLink size={14} />
                                            </a>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={2} className="px-5 py-8 text-center text-zinc-500">
                                        No campaign resources available.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>

                </div>

            </section>

            {/* My Submissions */}

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7">

                {/* Header */}
                <div className="flex items-center justify-between">

                    <div>
                        <h2 className="text-xl font-semibold">
                            My Submissions
                        </h2>

                        <p className="mt-1 text-sm text-zinc-500">
                            Manage your submitted clips, monitor review status and track your earnings.
                        </p>
                    </div>

                </div>

                {/* Table */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">

                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar">

                        <table className="min-w-full">

                            <thead className="sticky top-0 z-20 bg-[#11111A]/95 backdrop-blur-md">

                                <tr className="border-b border-white/10">

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        ID
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Username
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Platform
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Views
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Status
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Earned
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Pending Payout
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Actions
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {submissionsLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={`skeleton-${i}`} className="border-b border-white/5">
                                            <td className="px-5 py-5"><div className="h-4 w-6 animate-pulse rounded bg-white/10" /></td>
                                            <td className="px-5 py-5"><div className="h-4 w-24 animate-pulse rounded bg-white/10" /></td>
                                            <td className="px-5 py-5"><div className="h-9 w-9 animate-pulse rounded-lg bg-white/10" /></td>
                                            <td className="px-5 py-5"><div className="h-4 w-12 animate-pulse rounded bg-white/10" /></td>
                                            <td className="px-5 py-5"><div className="h-6 w-20 animate-pulse rounded-full bg-white/10" /></td>
                                            <td className="px-5 py-5"><div className="h-4 w-14 animate-pulse rounded bg-white/10" /></td>
                                            <td className="px-5 py-5"><div className="h-4 w-14 animate-pulse rounded bg-white/10" /></td>
                                            <td className="px-5 py-5"><div className="ml-auto h-9 w-20 animate-pulse rounded-xl bg-white/10" /></td>
                                        </tr>
                                    ))
                                ) : submissionList.length > 0 ? (
                                    submissionList.map((submission, index) => {
                                        const platform = PLATFORM_ICONS[submission.platform];
                                        const PlatformIcon = platform?.icon;

                                        return (
                                            <tr
                                                key={submission.id}
                                                className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                                            >

                                                {/* ID */}
                                                <td className="px-5 py-5 text-zinc-500">
                                                    {index + 1}
                                                </td>

                                                {/* Username */}
                                                <td className="px-5 py-5">
                                                    <p className="font-medium text-white">
                                                        {submission.username || "—"}
                                                    </p>
                                                </td>

                                                {/* Platform */}
                                                <td className="px-5 py-5">
                                                    {PlatformIcon ? (
                                                        submission.postUrl ? (
                                                            <a
                                                                href={submission.postUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-white transition cursor-pointer hover:opacity-80 ${platform.badge}`}
                                                                title={`View on ${submission.platform}`}
                                                            >
                                                                <PlatformIcon size={16} />
                                                            </a>
                                                        ) : (
                                                            <div
                                                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${platform.badge}`}
                                                                title={submission.platform}
                                                            >
                                                                <PlatformIcon size={16} />
                                                            </div>
                                                        )
                                                    ) : (
                                                        <span className="text-zinc-600">—</span>
                                                    )}
                                                </td>

                                                {/* Views */}
                                                <td className="px-5 py-5">
                                                    {submission.postUrl ? (
                                                        <a
                                                            href={submission.postUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-zinc-300 underline decoration-white/20 underline-offset-2 transition hover:text-violet-400"
                                                        >
                                                            {submission.views}
                                                        </a>
                                                    ) : (
                                                        <span className="text-zinc-500">{submission.views}</span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-5">
                                                    <span
                                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[submission.status]}`}
                                                    >
                                                        <span className="h-2 w-2 rounded-full bg-current" />
                                                        {submission.status}
                                                    </span>
                                                </td>

                                                {/* Earned */}
                                                <td className="px-5 py-5 font-medium text-white">
                                                    {submission.earnings
                                                        ? formatINR(submission.earnings)
                                                        : "-"}
                                                </td>

                                                {/* Pending Payout */}
                                                <td className="px-5 py-5 text-zinc-300">
                                                    {submission.pendingPayout
                                                        ? formatINR(submission.pendingPayout)
                                                        : "-"}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-5">

                                                    <div className="flex justify-end gap-2">

                                                        {submission.postUrl ? (
                                                            <a
                                                                href={submission.postUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs transition hover:border-violet-500/30 hover:bg-violet-500/10"
                                                                title="View post"
                                                            >
                                                                <ExternalLink size={14} />
                                                                View {submission.username || ""}
                                                            </a>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/5 px-3 py-2 text-xs text-zinc-700"
                                                                title="No post yet"
                                                            >
                                                                <ExternalLink size={14} />
                                                                View
                                                            </span>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(submission)}
                                                            className="rounded-xl border border-red-500/20 p-2 text-red-400 transition hover:bg-red-500/10"
                                                            title="Delete submission"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-16">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10">
                                                    <Send size={22} className="text-violet-400" />
                                                </div>
                                                <h3 className="mt-5 text-base font-semibold text-white">
                                                    No submissions yet
                                                </h3>
                                                <p className="mt-2 max-w-sm text-sm text-zinc-500">
                                                    You haven't submitted any content for this campaign. Submit
                                                    your first clip to start tracking views and earnings.
                                                </p>
                                                <button
                                                    type="button"
                                                    disabled={notice.blocked}
                                                    title={notice.blocked ? notice.title : undefined}
                                                    onClick={() => setShowSubmitDialog(true)}
                                                    className={`mt-6 rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                                                        notice.blocked
                                                            ? "cursor-not-allowed bg-white/5 text-zinc-500"
                                                            : "bg-violet-600 hover:bg-violet-500"
                                                    }`}
                                                >
                                                    Submit Clip
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </section>
            <ConfirmModal
                open={showDeleteModal}
                onCancel={() => {
                    setShowDeleteModal(false);
                    setSelectedSubmission(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Submission?"
                description={`Are you sure you want to delete "${selectedSubmission?.title}"? ${
                    selectedSubmission?.status === "Approved"
                        ? "Even though this submission is approved, the 24-hour cooling period will still apply."
                        : "Note: The 24-hour cooling period will still apply after deletion."
                }`}
                confirmText="Delete"
                color="red"
                icon={Trash2}
            />

            <SubmitClipDialog
                isOpen={showSubmitDialog}
                onClose={() => setShowSubmitDialog(false)}
                campaignId={gig.id}
                onSubmit={handleSubmitClip}
            />
        </div>

    );
}