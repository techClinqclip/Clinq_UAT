import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    Wallet,
    BriefcaseBusiness,
    FileCheck,
    Clock3,
    PlayCircle,
    PlusCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import MarketplaceLoadingSkeleton from "../../components/MarketplaceLoadingSkeleton";
import { api } from "../../lib/api";
import { FaInstagram, FaYoutube, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const STATUS_STYLES = {
    Approved: "bg-green-500/10 text-green-400",
    Pending: "bg-yellow-500/10 text-yellow-400",
    Rejected: "bg-red-500/10 text-red-400",
};

const DATE_OPTIONS = {
    day: "2-digit",
    month: "short",
    year: "numeric",
};

// Same dashed-border, icon-circle, heading, description, CTA pattern used
// across the app's other empty states (MyGigs, CreatorAnalytics, etc).
function EmptyState({ icon: Icon, title, description, ctaLabel, ctaTo, className = "" }) {
    return (
        <div className={`col-span-full rounded-2xl border border-dashed border-white/10 bg-black/20 px-8 py-16 text-center ${className}`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
                <Icon size={28} className="text-violet-400" />
            </div>

            <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">{description}</p>

            {ctaLabel && ctaTo ? (
                <Link
                    to={ctaTo}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
                >
                    <PlusCircle size={16} />
                    {ctaLabel}
                </Link>
            ) : null}
        </div>
    );
}

export default function ClipperDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [gigs, setGigs] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        let mounted = true;

        const loadDashboard = async () => {
            setLoading(true);
            setError("");

            try {
                const [gigsData, submissionsData] = await Promise.all([
                    api("/api/content/campaigns/clipper-gigs/?summary=true"),
                    api("/api/content/clipper-submissions/"),
                ]);

                if (!mounted) return;
                setGigs(Array.isArray(gigsData) ? gigsData : []);
                setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
            } catch (err) {
                if (!mounted) return;
                setError(err?.message || "Unable to load dashboard data.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        loadDashboard();
        return () => {
            mounted = false;
        };
    }, []);

    const stats = useMemo(() => {
        const totalEarnings = gigs.reduce((sum, gig) => sum + Number(gig.myEarnings || 0), 0);
        const activeGigsCount = gigs.filter((gig) => gig.status === "Active").length;
        const submittedClips = submissions.length;
        const pendingReviews = submissions.filter((submission) => submission.status === "Pending").length;

        return [
            {
                title: "Total Earnings",
                value: `₹${totalEarnings.toLocaleString()}`,
                icon: Wallet,
                link: "/clipper/earnings",
            },
            {
                title: "Active Gigs/Campaigns",
                value: activeGigsCount,
                icon: BriefcaseBusiness,
                link: "/clipper/gigs",
            },
            {
                title: "Submitted Clips",
                value: submittedClips,
                icon: FileCheck,
                link: "/clipper/gigs",
            },
            {
                title: "Pending Reviews",
                value: pendingReviews,
                icon: Clock3,
                link: "/clipper/gigs",
            },
        ];
    }, [gigs, submissions]);

    const activeGigs = useMemo(() => {
        const active = gigs.filter((gig) => gig.status === "Active");
        return active.length ? active.slice(0, 3) : gigs.slice(0, 3);
    }, [gigs]);

    const recentSubmissions = useMemo(() => submissions.slice(0, 5), [submissions]);

    const hasGigs = activeGigs.length > 0;
    const hasSubmissions = recentSubmissions.length > 0;

    const formatDeadline = (deadline) => {
        if (!deadline) return "No deadline";
        const date = new Date(deadline);
        if (Number.isNaN(date.getTime())) return deadline;
        return date.toLocaleDateString("en-IN", DATE_OPTIONS);
    };

    const formatRupees = (value) => {
        const amount = Number(value || 0);
        return `₹${amount.toLocaleString()}`;
    };

    const platformIcon = (platform) => {
        if (!platform) return null;
        const normalized = String(platform).toLowerCase();

        if (normalized.includes("instagram")) {
            return <FaInstagram className="text-pink-500" size={20} />;
        }
        if (normalized.includes("youtube")) {
            return <FaYoutube className="text-red-500" size={20} />;
        }
        if (normalized.includes("facebook")) {
            return <FaFacebook className="text-blue-500" size={20} />;
        }
        if (normalized === "x" || normalized.includes("twitter")) {
            return <FaXTwitter className="text-white" size={18} />;
        }

        return null;
    };

    if (loading) {
        return <MarketplaceLoadingSkeleton />;
    }

    return (
        <div className="space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
                <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            items={[
                                {
                                    label: "Dashboard",
                                    path: "/clipper/dashboard",
                                },
                            ]}
                        />
                        <p className="text-sm uppercase tracking-[0.25em] text-violet-400">Clipper Workspace</p>
                        <h1 className="mt-3 text-4xl font-bold text-white">Welcome Back 👋</h1>
                        <p className="mt-4 max-w-2xl text-zinc-400">
                            Manage your active gigs, monitor submissions, track earnings, and grow your clipping career from one place.
                        </p>
                    </div>

                    <Link
                        to="/clipper/gigs"
                        className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
                    >
                        <PlayCircle size={18} />
                        View My Gigs
                    </Link>
                </div>
            </section>

            {error ? (
                <div className="rounded-3xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-200">{error}</div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={stat.title}
                            to={stat.link}
                            className="group block rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                                    <Icon size={22} className="text-violet-400" />
                                </div>
                            </div>
                            <h2 className="mt-6 text-4xl font-bold text-white">{stat.value}</h2>
                            <p className="mt-2 text-zinc-400">{stat.title}</p>
                        </Link>
                    );
                })}
            </div>

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Top Gigs/Campaigns</h2>
                        <p className="mt-2 text-zinc-400">Gigs you're currently participating in.</p>
                    </div>
                    <Link to="/clipper/gigs" className="flex items-center gap-2 text-violet-400 transition hover:text-violet-300">
                        View All
                        <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    {hasGigs ? (
                        activeGigs.map((gig) => (
                            <Link
                                key={gig.id}
                                to={`/clipper/gigs/${gig.accessKey}`}
                                className="group rounded-2xl border border-white/10 bg-black/20 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-white/[0.02]"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">{gig.status || "Unknown"}</span>
                                </div>
                                <h3 className="mt-5 text-xl font-semibold text-white">{gig.name || gig.title || "Untitled gig"}</h3>
                                <p className="mt-1 text-zinc-400">{gig.brandName || gig.brand || "Unknown brand"}</p>

                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-zinc-500">Reward Pool</span>
                                        <span className="font-semibold text-violet-400">{formatRupees(gig.rewardPool)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-zinc-500">Deadline</span>
                                        <span className="font-medium text-white">{formatDeadline(gig.deadline)}</span>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center gap-2 text-sm font-medium text-zinc-400 transition group-hover:text-violet-400">
                                    Open Gig
                                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                                </div>
                            </Link>
                        ))
                    ) : (
                        <EmptyState
                            icon={BriefcaseBusiness}
                            title="No Gigs Yet"
                            description="You haven't joined any gigs yet. Browse the marketplace to find your first one."
                            ctaLabel="Browse Gigs"
                            ctaTo="/marketplace"
                        />
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Recent Submissions</h2>
                        <p className="mt-2 text-zinc-400">Track the status and performance of your latest submissions.</p>
                    </div>
                </div>

                {hasSubmissions ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="border-b border-white/10">
                                <tr className="text-left text-sm text-zinc-500">
                                    <th className="pb-4 font-medium">ID</th>
                                    <th className="pb-4 font-medium">Submission</th>
                                    <th className="pb-4 text-center font-medium">Platform</th>
                                    <th className="pb-4 font-medium">Views</th>
                                    <th className="pb-4 font-medium">Status</th>
                                    <th className="pb-4 font-medium">Earned</th>
                                    <th className="pb-4 font-medium">Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSubmissions.map((submission) => (
                                    <tr key={submission.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                                        <td className="py-5 font-mono text-sm text-zinc-400">#{submission.id}</td>
                                        <td className="py-5">
                                            <p className="font-medium text-white">{submission.clipTitle || submission.title || "Submission"}</p>
                                        </td>
                                        <td className="py-5 text-center">
                                            <div className="flex justify-center">{platformIcon(submission.platform)}</div>
                                        </td>
                                        <td className="py-5 font-medium text-white">{submission.views ?? 0}</td>
                                        <td className="py-5">
                                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[submission.status] || "bg-zinc-500/10 text-zinc-300"}`}>
                                                {submission.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="py-5 font-semibold text-green-400">{formatRupees(submission.earned || submission.earning || 0)}</td>
                                        <td className="py-5 text-zinc-400">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString("en-IN", DATE_OPTIONS) : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        icon={FileCheck}
                        title="No Submissions Yet"
                        description="Once you submit a clip to a gig, it'll show up here with its status, views, and earnings."
                        ctaLabel="Browse Gigs"
                        ctaTo="/marketplace"
                    />
                )}
            </section>
        </div>
    );
}
