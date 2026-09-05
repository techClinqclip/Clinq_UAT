import {
  Plus,
  ArrowRight,
  Megaphone,
  Eye,
  Handshake,
  Wallet,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
const stats = [
  {
    title: "Total Campaigns",
    value: "24",
    icon: Megaphone,
  },
  {
    title: "Active Campaigns",
    value: "8",
    icon: TrendingUp,
  },
  {
    title: "Views Generated",
    value: "1.2M",
    icon: Eye,
  },
  {
    title: "Collaborations",
    value: "15",
    icon: Handshake,
  },
  {
    title: "Total Earnings",
    value: "₹120K",
    icon: IndianRupee,
  },
  {
    title: "Payouts",
    value: "₹52K",
    icon: Wallet,
  },
];

const topCampaigns = [
  {
    name: "Podcast Clips Campaign",
    views: "520K",
    status: "Active",
  },
  {
    name: "Fitness Reels Campaign",
    views: "320K",
    status: "Active",
  },
  {
    name: "Tech Shorts Campaign",
    views: "180K",
    status: "Completed",
  },
];

const recentCampaigns = [
  {
    name: "Podcast Clips Campaign",
    status: "Active",
    views: "520K",
  },
  {
    name: "Finance Creator Campaign",
    status: "Active",
    views: "210K",
  },
  {
    name: "Gaming Shorts Campaign",
    status: "Draft",
    views: "0",
  },
  {
    name: "Fitness Reels Campaign",
    status: "Completed",
    views: "320K",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-violet-400">
              Brand Workspace
            </p>

            <h1 className="mt-3 text-4xl font-bold text-white">
              Welcome Back 👋
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Track campaign performance, manage clippers and monitor payouts
              from one place.
            </p>
          </div>

          <Link
  to="/dashboard/campaigns/create"
  className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white"
>
  <Plus size={18} />
  Create Campaign
</Link>
        </div>
      </section>

      {/* KPI Section */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="group rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Icon size={22} className="text-violet-400" />
                </div>

                <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
                  +12%
                </span>
              </div>

              <h2 className="mt-6 text-4xl font-bold text-white">
                {stat.value}
              </h2>

              <p className="mt-2 text-zinc-400">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Top Performing Campaigns */}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Top Performing Campaigns
          </h2>

          <button className="flex items-center gap-2 text-violet-400 hover:text-violet-300">
            View All
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {topCampaigns.map((campaign) => (
            <div
              key={campaign.name}
              className="rounded-2xl border border-white/10 bg-black/20 p-6 transition hover:border-violet-500/30"
            >
              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                {campaign.status}
              </span>

              <h3 className="mt-4 text-xl font-semibold text-white">
                {campaign.name}
              </h3>

              <p className="mt-4 text-3xl font-bold text-violet-400">
                {campaign.views}
              </p>

              <p className="text-zinc-500">Views Generated</p>

              <button className="mt-6 text-sm font-medium text-white hover:text-violet-400">
                View Details →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign Showcase */}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Campaign Showcase
          </h2>

          <button className="flex items-center gap-2 text-violet-400 hover:text-violet-300">
            View All Campaigns
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {recentCampaigns.map((campaign) => (
            <div
              key={campaign.name}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-violet-500/30 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="font-semibold text-white">
                  {campaign.name}
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  {campaign.status}
                </p>
              </div>

              <div className="flex items-center gap-8">
                <div>
                  <p className="text-lg font-semibold text-white">
                    {campaign.views}
                  </p>

                  <p className="text-sm text-zinc-500">Views</p>
                </div>

                <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-violet-500/30">
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}