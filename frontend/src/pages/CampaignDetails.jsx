import {
  ArrowLeft,
  Eye,
  Users,
  BriefcaseBusiness,
  CheckCircle,
  Clock,
  IndianRupee,
  // Youtube,
  // Instagram,
  Pencil,
  Pause,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { FaYoutube, FaInstagram } from "react-icons/fa";
import { Globe } from "lucide-react";
const campaign = {
  title: "Podcast Clips Campaign",
  status: "Active",
  budget: "₹10,000",
  reward: "₹500",
  views: "520K",
  joined: 128,
  working: 73,
  submitted: 42,
  approved: 18,
  pending: 24,
};

const clippers = [
  {
    id: 1,
    name: "Rahul Sharma",
    platform: "YouTube",
    followers: "120K",
    status: "Working",
  },
  {
    id: 2,
    name: "Aman Gupta",
    platform: "Instagram",
    followers: "80K",
    status: "Submitted",
  },
  {
    id: 3,
    name: "Priya Singh",
    platform: "YouTube",
    followers: "250K",
    status: "Working",
  },
];

const submissions = [
  {
    id: 1,
    title: "Podcast Highlight #1",
    clipper: "Rahul Sharma",
    views: "15K",
    likes: "1.2K",
    status: "Pending",
  },
  {
    id: 2,
    title: "Podcast Viral Moment",
    clipper: "Aman Gupta",
    views: "27K",
    likes: "2.8K",
    status: "Approved",
  },
];

export default function CampaignDetails() {
  return (
    <div className="space-y-8">

      {/* Back */}

      <Link
        to="/dashboard/campaigns"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Campaigns
      </Link>

      {/* Hero */}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/10 via-[#11111A] to-[#0B0B12] p-8">

        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">

          <div>

            <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
              {campaign.status}
            </span>

            <h1 className="mt-4 text-4xl font-bold text-white">
              {campaign.title}
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Create engaging clips from podcast episodes and help
              maximize reach across social platforms.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button className="rounded-xl border border-white/10 px-4 py-2 text-white hover:border-violet-500/30">
              <Pencil size={16} className="inline mr-2" />
              Edit
            </button>

            <button className="rounded-xl border border-yellow-500/20 px-4 py-2 text-yellow-400">
              <Pause size={16} className="inline mr-2" />
              Pause
            </button>

            <button className="rounded-xl border border-white/10 px-4 py-2 text-white">
              <Download size={16} className="inline mr-2" />
              Export
            </button>

          </div>

        </div>

      </section>

      {/* Overview */}

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

        <h2 className="text-2xl font-bold text-white">
          Campaign Overview
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          <div>
            <p className="text-zinc-500">Budget</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {campaign.budget}
            </p>
          </div>

          <div>
            <p className="text-zinc-500">Reward / Clip</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {campaign.reward}
            </p>
          </div>

          <div>
            <p className="text-zinc-500">Platforms</p>

            <div className="flex gap-2">
  <span className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white">
    YouTube
  </span>

  <span className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white">
    Instagram
  </span>
</div>
          </div>

          <div>
            <p className="text-zinc-500">Campaign Status</p>
            <p className="mt-2 text-xl font-semibold text-green-400">
              Active
            </p>
          </div>

        </div>

      </section>

      {/* KPI Cards */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">

        {[
          {
            label: "Views",
            value: campaign.views,
            icon: Eye,
          },
          {
            label: "Joined",
            value: campaign.joined,
            icon: Users,
          },
          {
            label: "Working",
            value: campaign.working,
            icon: BriefcaseBusiness,
          },
          {
            label: "Submitted",
            value: campaign.submitted,
            icon: CheckCircle,
          },
          {
            label: "Approved",
            value: campaign.approved,
            icon: CheckCircle,
          },
          {
            label: "Pending",
            value: campaign.pending,
            icon: Clock,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-[#11111A] p-5"
            >
              <Icon
                size={18}
                className="mb-3 text-violet-400"
              />

              <h3 className="text-3xl font-bold text-white">
                {item.value}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                {item.label}
              </p>
            </div>
          );
        })}

      </div>

      {/* Clippers */}

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

        <h2 className="text-2xl font-bold text-white">
          Clippers Working On This Campaign
        </h2>

        <div className="mt-6 overflow-x-auto">

          <table className="w-full">

            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-left text-zinc-500">Name</th>
                <th className="pb-4 text-left text-zinc-500">Platform</th>
                <th className="pb-4 text-left text-zinc-500">Followers</th>
                <th className="pb-4 text-left text-zinc-500">Status</th>
              </tr>
            </thead>

            <tbody>

              {clippers.map((clipper) => (
                <tr
                  key={clipper.id}
                  className="border-b border-white/5"
                >
                  <td className="py-5 text-white">
                    {clipper.name}
                  </td>

                  <td className="py-5 text-white">
                    {clipper.platform}
                  </td>

                  <td className="py-5 text-white">
                    {clipper.followers}
                  </td>

                  <td className="py-5">
                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-sm text-violet-400">
                      {clipper.status}
                    </span>
                  </td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </section>

      {/* Submissions */}

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

        <h2 className="text-2xl font-bold text-white">
          Submitted Work
        </h2>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">

          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="rounded-2xl border border-white/10 p-5"
            >

              <div className="aspect-video rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500">
                Thumbnail
              </div>

              <h3 className="mt-4 text-lg font-semibold text-white">
                {submission.title}
              </h3>

              <p className="mt-2 text-zinc-400">
                {submission.clipper}
              </p>

              <div className="mt-4 flex gap-6 text-sm">
                <span className="text-white">
                  {submission.views} Views
                </span>

                <span className="text-white">
                  {submission.likes} Likes
                </span>
              </div>

              <div className="mt-5 flex gap-3">

                <button className="rounded-xl bg-green-500/10 px-4 py-2 text-green-400">
                  Approve
                </button>

                <button className="rounded-xl bg-red-500/10 px-4 py-2 text-red-400">
                  Reject
                </button>

                <button className="rounded-xl border border-white/10 px-4 py-2 text-white">
                  View
                </button>

              </div>

            </div>
          ))}

        </div>

      </section>

      {/* Analytics */}

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

        <h2 className="text-2xl font-bold text-white">
          Analytics
        </h2>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">

          <div className="flex h-[250px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-zinc-500">
            Views Over Time
          </div>

          <div className="flex h-[250px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-zinc-500">
            Submission Growth
          </div>

        </div>

      </section>

    </div>
  );
}