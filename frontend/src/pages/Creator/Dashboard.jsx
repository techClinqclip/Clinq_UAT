import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  ArrowRight,
  Megaphone,
  Eye,
  Wallet,
  TrendingUp,
  BriefcaseBusiness,
  FileCheck,
} from "lucide-react";

import { Link } from "react-router-dom";
import { api } from "../../lib/api";

const formatCompact = (value) => {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }

  return value ?? "0";
};

const formatCurrency = (value) => `₹${formatCompact(value)}`;

// Same visual language as the empty states elsewhere in the app
// (dashed border, icon circle, heading, description, CTA).
function EmptyTopGigs() {
  return (
    <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-black/20 px-8 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
        <Megaphone size={28} className="text-violet-400" />
      </div>

      <h3 className="mt-5 text-xl font-semibold text-white">No Gigs Yet</h3>

      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
        Launch your first gig to start tracking views and submissions here.
      </p>

      <Link
        to="/creator/gigs/create"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
      >
        <Plus size={16} />
        Create Gig
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [topGigs, setTopGigs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api("/api/creator/dashboard/?summary=true");

        if (!isMounted) return;

        const dashboardStats = [
          {
            title: "Total Gigs",
            value: data?.stats?.total_gigs ?? 0,
            link: "/creator/gigs",
            icon: Megaphone,
          },
          {
            title: "Active Gigs",
            value: data?.stats?.active_gigs ?? 0,
            link: "/creator/gigs?status=active",
            icon: TrendingUp,
          },
          {
            title: "Views Generated",
            value: formatCompact(data?.stats?.views_generated ?? 0),
            link: "/creator/analytics",
            icon: Eye,
          },
          {
            title: "Brand Deals",
            value: data?.stats?.brand_deals ?? 0,
            link: "/creator/submissions",
            icon: BriefcaseBusiness,
          },
          {
            title: "Total Earnings",
            value: formatCurrency(data?.stats?.total_earnings ?? 0),
            link: "/creator/submissions",
            icon: Wallet,
          },
          {
            title: "Total Submissions",
            value: data?.stats?.total_submissions ?? 0,
            link: "/creator/submissions",
            icon: FileCheck,
          },
        ];

        setStats(dashboardStats);
        setProfile(data?.profile ?? null);
        setTopGigs((data?.top_gigs || []).map((gig) => ({
          id: gig.id,
          // Dashboard data exposes a UUID accessKey; numeric IDs remain a
          // compatible fallback for older API responses.
          accessKey: gig.accessKey || gig.access_key || gig.id,
          name: gig.title,
          views: formatCompact(gig.views ?? 0),
          submissions: gig.submissions_count ?? 0,
          status: gig.status?.charAt(0).toUpperCase() + gig.status?.slice(1) || "Draft",
        })));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Unable to load creator dashboard right now.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const heroTitle = useMemo(() => {
    if (profile?.firstname) {
      return `Welcome back, ${profile.firstname}`;
    }
    return "Welcome Back 👋";
  }, [profile]);

  const hasTopGigs = topGigs.length > 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-violet-400">Creator Studio</p>
            <h1 className="mt-3 text-4xl font-bold text-white">{heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">
              Manage your gigs, resources and creator community from one place.
            </p>
          </div>

          <Link
            to="/creator/gigs/create"
            className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white"
          >
            <Plus size={18} />
            Create Gig
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-6">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-white/10" />
                <div className="mt-6 h-8 w-24 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-4 w-32 animate-pulse rounded bg-white/10" />
              </div>
            ))
          : stats.map((stat) => {
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
          <h2 className="text-2xl font-bold text-white">Top Performing Gigs</h2>
          <Link to="/creator/gigs" className="flex items-center gap-2 text-violet-400 hover:text-violet-300">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                <div className="mt-4 h-6 w-36 animate-pulse rounded bg-white/10" />
                <div className="mt-6 h-12 w-full animate-pulse rounded bg-white/10" />
              </div>
            ))
          ) : hasTopGigs ? (
            topGigs.map((gig) => (
              <Link
                key={gig.id}
                to={`/creator/gigs/${gig.accessKey}`}
                className="group block rounded-2xl border border-white/10 bg-black/20 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40"
              >
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">{gig.status}</span>
                <h3 className="mt-4 text-xl font-semibold text-white">{gig.name}</h3>

                <div className="mt-6 flex justify-between">
                  <div>
                    <p className="text-3xl font-bold text-violet-400">{gig.views}</p>
                    <p className="text-sm text-zinc-500">Views</p>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">{gig.submissions}</p>
                    <p className="text-sm text-zinc-500">Submissions</p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyTopGigs />
          )}
        </div>
      </section>
    </div>
  );
}
