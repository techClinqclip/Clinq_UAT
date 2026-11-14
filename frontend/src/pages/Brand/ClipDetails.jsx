import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  IndianRupee,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

/*
  Approve/Reject were removed from this page on purpose: that decision now
  belongs to the platform, not the brand. The brand's only moderation
  power here is removing a submission entirely (Delete), which is gated
  behind a confirmation since it's destructive.

  MOCK_CLIP stands in for a real fetch by clipId. Note it carries
  campaignId/clipperId — a real API response for a single clip should
  include which campaign/clipper it belongs to, since that's needed to
  build the "Back to Submissions" link and isn't derivable from the
  clip's own :clipId route param alone.
*/

const MOCK_CLIP = {
  title: "Podcast Highlight #4",
  clipper: "@rahul_editz",
  platform: "YouTube Shorts",
  views: "72K",
  likes: "5.2K",
  comments: "340",
  shares: "810",
  payoutRate: "₹20 / 1k Views",
  earned: "₹1,440",
  status: "Pending",
  campaignId: 1,
  clipperId: 1,
};

const STATUS_STYLES = {
  Approved: "bg-green-500/10 text-green-400",
  Pending: "bg-yellow-500/10 text-yellow-400",
  Rejected: "bg-red-500/10 text-red-400",
};

export default function ClipDetails() {
  const { clipId } = useParams(); // TODO: fetch the real clip by this id instead of MOCK_CLIP
  const clip = MOCK_CLIP;

  const [notes, setNotes] = useState("");

  const backToSubmissions = `/brand/campaigns/${clip.campaignId}/clippers/${clip.clipperId}`;

  return (
    <div className="space-y-8">

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-surface-2 to-surface-1 p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="relative z-10">
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

            {/* Delete control hidden — needs DELETE /clips/:clipId API */}
          </div>
        </div>
      </section>

      {/* Video Preview */}
      <section className="rounded-3xl border border-white/10 bg-surface-2 p-8">
        <h2 className="text-2xl font-bold text-white">Video Preview</h2>
        <div className="mt-6 flex aspect-video items-center justify-center rounded-3xl border border-dashed border-violet-500/20 bg-violet-500/5 text-zinc-500">
          Video Player Placeholder
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Eye className="mb-3 text-violet-400" />
          <h2 className="text-4xl font-bold text-white">{clip.views}</h2>
          <p className="mt-2 text-zinc-500">Views</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Heart className="mb-3 text-pink-400" />
          <h2 className="text-4xl font-bold text-white">{clip.likes}</h2>
          <p className="mt-2 text-zinc-500">Likes</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-2 p-6">
          <MessageCircle className="mb-3 text-blue-400" />
          <h2 className="text-4xl font-bold text-white">{clip.comments}</h2>
          <p className="mt-2 text-zinc-500">Comments</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Share2 className="mb-3 text-green-400" />
          <h2 className="text-4xl font-bold text-white">{clip.shares}</h2>
          <p className="mt-2 text-zinc-500">Shares</p>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <section className="rounded-3xl border border-white/10 bg-surface-2 p-8">
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
      <section className="rounded-3xl border border-white/10 bg-surface-2 p-8">
        <h2 className="text-2xl font-bold text-white">Review Notes</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Internal notes for your team — not visible to the clipper.
        </p>

        <textarea
          rows={5}
          placeholder="Add feedback for the clipper..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-surface-1 p-4 text-white outline-none focus:border-violet-500"
        />

        {/* Save Notes control hidden — needs PATCH /clips/:clipId API */}
      </section>
    </div>
  );
}