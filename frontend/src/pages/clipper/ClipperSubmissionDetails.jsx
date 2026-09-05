import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Copy,
  Check,
  CircleDollarSign,
  Play,
  CalendarDays,
  Clock,
} from "lucide-react";
import { FaInstagram, FaYoutube, FaTiktok, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Breadcrumbs from "../../components/Breadcrumbs";

const platformIcons = {
  "Instagram Reels": FaInstagram,
  "YouTube Shorts": FaYoutube,
  TikTok: FaTiktok,
  Facebook: FaFacebook,
  X: FaXTwitter,
};

const STATUS_STYLES = {
  Approved: "bg-emerald-500/10 text-emerald-400",
  "Under Review": "bg-amber-500/10 text-amber-400",
  Submitted: "bg-sky-500/10 text-sky-400",
  Rejected: "bg-red-500/10 text-red-400",
};

const submission = {
  id: 1,
  title: "Podcast Clip #8",
  campaign: "Podcast Shorts Challenge",
  creator: "Ali Abdaal",

  status: "Approved",

  submittedOn: "24 Jul 2026",

  platform: "Instagram Reels",

  views: "890K",

  earnings: 5100,

  duration: "00:38",

  resolution: "1080 × 1920",

  thumbnail:
    "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?q=80&w=1600&auto=format&fit=crop",

  videoUrl: "#",

  caption:
    "Stop wasting time. Here's one productivity habit that completely changed how I work.",

  hashtags: ["#productivity", "#motivation", "#aliabdaal", "#shorts"],

  timeline: [
    { status: "Submitted", date: "24 Jul 2026" },
    { status: "Under Review", date: "25 Jul 2026" },
    { status: "Approved", date: "26 Jul 2026" },
  ],
};

const PlatformIcon = platformIcons[submission.platform];

function StatCard({ icon: Icon, color, label, value }) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-400",
    sky: "bg-sky-500/10 text-sky-400",
    amber: "bg-amber-500/10 text-amber-400",
    orange: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[color]}`}>
        <Icon size={16} />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export default function ClipperSubmissionDetails() {
  const { gigId } = useParams();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(submission.videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — button just won't confirm, nothing to break
    }
  };

  const statusStyle = STATUS_STYLES[submission.status] ?? "bg-zinc-500/10 text-zinc-400";
  const platformShortName = submission.platform.split(" ")[0];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <Breadcrumbs
          overrides={{
            Gig: submission.campaign,
            Submission: submission.title,
          }}
        />

        <Link
          to={`/clipper/gigs/${gigId}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Back to Gig
        </Link>

        {/* Header */}
        <div className="mt-2 max-w-2xl">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}>
            {submission.status}
          </span>

          <h1 className="mt-5 text-4xl font-bold">{submission.title}</h1>

          <p className="mt-3 text-zinc-400">
            {submission.campaign} <span className="text-zinc-600">·</span> by {submission.creator}
          </p>

          <p className="mt-5 leading-7 text-zinc-300">{submission.caption}</p>
        </div>

        {/* Stats */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={CircleDollarSign} color="violet" label="Earnings" value={`₹${submission.earnings.toLocaleString()}`} />
          <StatCard icon={Eye} color="sky" label="Views" value={submission.views} />
          <StatCard icon={Clock} color="amber" label="Duration" value={submission.duration} />
          <StatCard icon={CalendarDays} color="orange" label="Submitted" value={submission.submittedOn} />
        </div>

        {/* Submission Asset */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Submission Asset</h2>
              <p className="mt-2 text-sm text-zinc-400">Details about the content submitted for this campaign.</p>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2">
              {PlatformIcon && <PlatformIcon className="text-lg text-violet-400" />}
              <span className="text-sm font-medium text-violet-300">{submission.platform}</span>
            </div>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* Clip preview */}
            <div className="mx-auto w-full max-w-[240px] lg:mx-0">
              <a
                href={submission.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900 shadow-2xl shadow-black/50 transition hover:border-violet-500/40"
              >
                <div className="relative aspect-[9/16]">
                  {submission.thumbnail ? (
                    <img
                      src={submission.thumbnail}
                      alt={submission.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                      {PlatformIcon && <PlatformIcon className="text-5xl text-zinc-700" />}
                      <p className="text-xs text-zinc-600">Thumbnail not available</p>
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" />

                  {PlatformIcon && (
                    <div className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                      <PlatformIcon className="text-xs text-white" />
                    </div>
                  )}

                  <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    {submission.duration}
                  </div>

                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition group-hover:scale-110 group-hover:bg-white">
                    <Play size={22} className="ml-0.5" fill="currentColor" />
                  </span>

                  <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-white">
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <Eye size={13} />
                      {submission.views}
                    </span>
                    <span className="text-xs text-white/70">{submission.resolution}</span>
                  </div>
                </div>
              </a>
              <p className="mt-3 text-center text-xs text-zinc-500">Tap to watch the full clip</p>
            </div>

            {/* Metadata */}
            <div>
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-zinc-500">Duration</p>
                  <p className="mt-2 font-medium">{submission.duration}</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Resolution</p>
                  <p className="mt-2 font-medium">{submission.resolution}</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Submitted On</p>
                  <p className="mt-2 font-medium">{submission.submittedOn}</p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Platform</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    {PlatformIcon && <PlatformIcon className="text-violet-400" />}
                    {submission.platform}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-sm text-zinc-500">Original Post</p>
                  <a
                    href={submission.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block truncate text-violet-400 transition hover:text-violet-300"
                  >
                    {submission.videoUrl}
                  </a>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={submission.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-medium transition hover:bg-violet-500"
                >
                  <Play size={18} fill="currentColor" />
                  Watch on {platformShortName}
                </a>

                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 font-medium transition hover:bg-white/5"
                >
                  {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Caption */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-semibold">Caption</h2>
          <p className="mt-2 text-sm text-zinc-400">Caption submitted with the original post.</p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="whitespace-pre-line leading-8 text-zinc-300">{submission.caption}</p>
          </div>
        </section>

        {/* Hashtags */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-semibold">Hashtags</h2>
          <p className="mt-2 text-sm text-zinc-400">Tags used to improve discoverability.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {submission.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Review Timeline */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-semibold">Review Timeline</h2>
          <p className="mt-2 text-sm text-zinc-400">Track the progress of your submission through the review process.</p>

          <div className="mt-8 space-y-8">
            {submission.timeline.map((item, index) => {
              const isCurrent = index === submission.timeline.length - 1;
              return (
                <div key={item.status} className="relative flex gap-5">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isCurrent ? "bg-violet-500" : "bg-violet-500/15"
                      }`}
                    >
                      {isCurrent ? (
                        <Check size={14} className="text-white" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-violet-400" />
                      )}
                    </div>
                    {index !== submission.timeline.length - 1 && (
                      <div className="mt-1 h-14 w-px bg-violet-500/20" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium">{item.status}</h4>
                    <p className="mt-1 text-sm text-zinc-500">{item.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}