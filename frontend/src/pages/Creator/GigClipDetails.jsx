import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Eye,
    Heart,
    MessageCircle,
    Share2,
    IndianRupee,
    Trash2,
    Check,
    X,
    ExternalLink,
    CalendarDays,
    Link2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";

const STATUS_STYLES = {
    Approved: "bg-green-500/10 text-green-400",
    Pending: "bg-yellow-500/10 text-yellow-400",
    Rejected: "bg-red-500/10 text-red-400",
};

function DeleteConfirmModal({ clipTitle, onCancel, onConfirm, isDeleting }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11111A] p-6">
                <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                        <Trash2 size={18} className="text-red-400" />
                    </div>
                    <button onClick={onCancel} className="text-zinc-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <h3 className="mt-4 text-lg font-bold text-white">Delete this submission?</h3>
                <p className="mt-1.5 text-sm text-zinc-400">
                    "{clipTitle}" will be permanently removed from this campaign. This can't be undone.
                </p>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white transition hover:border-white/20"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function GigClipDetails() {
    const { gigId, participantId, submissionId } = useParams();
    const navigate = useNavigate();

    const [clip, setClip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [notes, setNotes] = useState("");
    const [notesStatus, setNotesStatus] = useState("idle"); // idle | saving | saved
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let active = true;

        const loadSubmission = async () => {
            if (!gigId || !participantId || !submissionId) {
                setError("Missing submission route data.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data = await api(`/api/content/campaigns/${gigId}/clippers/${participantId}/submissions/`);
                const match = (data?.submissions || []).find((item) => String(item.id) === String(submissionId));

                if (!active) return;

                setClip(match ? {
                    id: match.id,
                    title: match.platformUsername || match.contentUrl || `Submission #${match.id}`,
                    clipper: data.participant?.username || "@clipper",
                    platform: match.platform || "Unknown",
                    submissionUrl: match.contentUrl || "",
                    submittedAt: match.createdAt ? new Date(match.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                    views: Number(match.views || 0).toLocaleString(),
                    likes: Number(match.likes || 0).toLocaleString(),
                    comments: Number(match.likes || 0).toLocaleString(),
                    shares: Number(match.likes || 0).toLocaleString(),
                    payoutRate: `₹${Number(match.earning || match.pendingEarning || 0).toLocaleString()} / submission`,
                    earned: `₹${Number(match.earning || 0).toLocaleString()}`,
                    status: match.status || "Pending",
                    campaignId: Number(gigId),
                    clipperId: Number(participantId),
                } : null);
            } catch (err) {
                if (!active) return;
                setError(err?.message || "Unable to load this submission.");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadSubmission();

        return () => {
            active = false;
        };
    }, [gigId, participantId, submissionId]);

    const backToSubmissions =
        `/creator/gigs/${gigId}/participants/${participantId}`;

    const handleSaveNotes = () => {
        setNotesStatus("saving");
        // TODO: PATCH /clips/:clipId { notes }
        setTimeout(() => {
            setNotesStatus("saved");
            setTimeout(() => setNotesStatus("idle"), 1800);
        }, 700);
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            const payload = deleteReason.trim() ? { reason: deleteReason.trim() } : {};
            await api(`/api/content/campaigns/${gigId}/clippers/${participantId}/submissions/${submissionId}/`, {
                method: "DELETE",
                body: payload,
            });
            navigate(backToSubmissions);
        } catch (err) {
            console.warn("Delete submission failed:", err);
        } finally {
            setIsDeleting(false);
            setIsDeleteOpen(false);
            setDeleteReason("");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-white">Loading submission…</div>;
    }

    if (error || !clip) {
        return (
            <div className="p-8 text-center text-red-400">
                <p>{error || "Submission not found."}</p>
                <Link to={backToSubmissions} className="mt-4 inline-block text-violet-400 hover:text-violet-300">
                    Back to submissions
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {isDeleteOpen && (
                <DeleteConfirmModal
                    clipTitle={clip.title}
                    isDeleting={isDeleting}
                    onCancel={() => {
                        setIsDeleteOpen(false);
                        setDeleteReason("");
                    }}
                    onConfirm={handleDeleteConfirm}
                />
            )}

            {/* Header */}
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
                <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

                <div className="relative z-10">
                    <Breadcrumbs
                        overrides={{
                            Gig: "Podcast Clips Campaign",
                            Participant: clip.clipper,
                            Clip: clip.title,
                        }}
                    />
                    <Link
                        to={backToSubmissions}
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                        Back to Submissions
                    </Link>

                    <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.25em] text-violet-400">Clip Review</p>
                            <h1 className="mt-3 text-4xl font-bold text-white">{clip.title}</h1>
                            <p className="mt-3 text-zinc-400">Submitted by {clip.clipper}</p>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-sm text-violet-400">
                                    {clip.platform}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-sm ${STATUS_STYLES[clip.status]}`}>
                                    {clip.status}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsDeleteOpen(true)}
                            className="flex items-center gap-2 self-start rounded-xl border border-red-500/20 px-5 py-3 text-red-400 transition hover:bg-red-500/10"
                        >
                            <Trash2 size={18} />
                            Delete Submission
                        </button>
                    </div>
                </div>
            </section>

            {/* Video Preview */}
            {/* Submission Details */}
            <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            Submission Details
                        </h2>

                        <p className="mt-1 text-zinc-500">
                            View the original submission and its current status.
                        </p>
                    </div>

                    <a
                        href={clip.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500"
                    >
                        <ExternalLink size={18} />
                        Open on Platform
                    </a>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="text-sm text-zinc-500">Platform</p>

                        <p className="mt-3 text-lg font-semibold text-white">
                            {clip.platform}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="text-sm text-zinc-500">Submitted On</p>

                        <div className="mt-3 flex items-center gap-2 text-white">
                            <CalendarDays size={18} className="text-violet-400" />
                            <span>{clip.submittedAt}</span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="text-sm text-zinc-500">Status</p>

                        <div className="mt-3">
                            <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[clip.status]}`}
                            >
                                {clip.status}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="text-sm text-zinc-500">Submission URL</p>

                        <div className="mt-3 flex items-center gap-2">
                            <Link2 size={18} className="text-violet-400" />

                            <a
                                href={clip.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-violet-400 transition hover:text-violet-300"
                            >
                                {clip.submissionUrl}
                            </a>
                        </div>
                    </div>
                </div>
            </section>
            {/* KPI Cards */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6">
                    <Eye className="mb-3 text-violet-400" />
                    <h2 className="text-4xl font-bold text-white">{clip.views}</h2>
                    <p className="mt-2 text-zinc-500">Views</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6">
                    <Heart className="mb-3 text-pink-400" />
                    <h2 className="text-4xl font-bold text-white">{clip.likes}</h2>
                    <p className="mt-2 text-zinc-500">Likes</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6">
                    <MessageCircle className="mb-3 text-blue-400" />
                    <h2 className="text-4xl font-bold text-white">{clip.comments}</h2>
                    <p className="mt-2 text-zinc-500">Comments</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6">
                    <Share2 className="mb-3 text-green-400" />
                    <h2 className="text-4xl font-bold text-white">{clip.shares}</h2>
                    <p className="mt-2 text-zinc-500">Shares</p>
                </div>
            </div>

            {/* Earnings Breakdown */}
            <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
                <h2 className="text-2xl font-bold text-white">Earnings Breakdown</h2>

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    <div>
                        <p className="text-zinc-500">Reward Model</p>
                        <p className="mt-2 text-xl font-semibold text-white">{clip.payoutRate}</p>
                    </div>

                    <div>
                        <p className="text-zinc-500">Total Views</p>
                        <p className="mt-2 text-xl font-semibold text-white">{clip.views}</p>
                    </div>

                    <div>
                        <p className="text-zinc-500">Total Earned</p>
                        <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-green-400">
                            <IndianRupee size={18} />
                            {clip.earned}
                        </p>
                    </div>
                </div>
            </section>

            {/* Review Notes */}
            <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
                <h2 className="text-2xl font-bold text-white">Review Notes</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    Internal notes for your team — not visible to the clipper.
                </p>

                <textarea
                    rows={5}
                    placeholder="Add feedback for the clipper..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-6 w-full rounded-2xl border border-white/10 bg-[#0B0B12] p-4 text-white outline-none focus:border-violet-500"
                />

                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={handleSaveNotes}
                        disabled={notesStatus === "saving"}
                        className={`flex items-center gap-2 rounded-xl px-5 py-3 text-white transition ${notesStatus === "saved" ? "bg-emerald-500" : "bg-violet-600 hover:bg-violet-500"
                            } ${notesStatus === "saving" ? "opacity-60" : ""}`}
                    >
                        {notesStatus === "saved" && <Check size={16} />}
                        {notesStatus === "saving" ? "Saving…" : notesStatus === "saved" ? "Saved" : "Save Notes"}
                    </button>
                </div>
            </section>
        </div>
    );
}
