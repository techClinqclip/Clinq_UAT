import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    BriefcaseBusiness,
    CircleCheckBig,
    Clock3,
    IndianRupee,
    ArrowRight,
    Search,
} from "lucide-react";

import { api } from "../../lib/api";
import Breadcrumbs from "../../components/Breadcrumbs";
import MarketplaceLoadingSkeleton from "../../components/MarketplaceLoadingSkeleton";
import GigCard from "./GigCard";

const filters = [
    "All",
    "Active",
    "Paused",
    "Closed",
];

export default function MyGigs() {
    const [gigs, setGigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");

    const normalizeString = (value, fallback = "") => {
        if (value === null || value === undefined) return fallback;
        const text = String(value).trim();
        return text || fallback;
    };

    const getGigTitle = (gig) => normalizeString(gig?.name || gig?.title || "Untitled gig", "Untitled gig");
    const getGigStatus = (gig) => normalizeString(gig?.status || "Active", "Active");

    useEffect(() => {
        let cancelled = false;

        async function loadGigs() {
            try {
                const data = await api("/api/content/campaigns/clipper-gigs/?summary=true");
                if (!cancelled) {
                    setGigs(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Failed to load clipper gigs", error);
                if (!cancelled) {
                    setGigs([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadGigs();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredGigs = useMemo(() => {
        return gigs.filter((gig) => {
            const title = getGigTitle(gig).toLowerCase();
            const brandName = normalizeString(gig?.brandName || "").toLowerCase();
            const matchesSearch = title.includes(search.toLowerCase()) || brandName.includes(search.toLowerCase());
            const matchesStatus = activeFilter === "All" || getGigStatus(gig) === activeFilter;

            return matchesSearch && matchesStatus;
        });
    }, [gigs, search, activeFilter]);

    const stats = [
        {
            title: "Active Gigs",
            value: gigs.filter((g) => g.status === "Active").length,
            icon: BriefcaseBusiness,
        },
        {
            title: "Completed",
            value: gigs.filter((g) => g.status === "Completed").length,
            icon: CircleCheckBig,
        },
        {
            title: "Pending Review",
            value: gigs.filter((g) => g.status === "Pending Review").length,
            icon: Clock3,
        },
        {
            title: "Total Earnings",
            value: `₹${gigs.reduce(
                (sum, gig) => sum + gig.myEarnings,
                0
            ).toLocaleString()}`,
            icon: IndianRupee,
        },
    ];

    // Loading is tracked separately from "no gigs" — without this gate, the
    // empty state ("No Gigs Found") renders immediately (since gigs starts
    // as []) and then gets swapped for real cards once the fetch resolves,
    // which reads as misleading. Show a proper skeleton until we actually
    // know whether there are gigs or not.
    if (loading) {
        return <MarketplaceLoadingSkeleton />;
    }

    return (
        <div className="space-y-8">
            <Breadcrumbs />

            {/* Hero */}

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-violet-400">
                            Clipper Workspace
                        </p>

                        <h1 className="mt-3 text-4xl font-bold text-white">
                            My Gigs
                        </h1>

                        <p className="mt-4 max-w-2xl text-zinc-400">
                            Track every gig you've joined, monitor deadlines, manage
                            submissions and keep an eye on your earnings.
                        </p>
                    </div>

                    <Link
                        to="/marketplace"
                        className="inline-flex items-center gap-2 self-start rounded-2xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500"
                    >
                        Browse More Gigs
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            {/* KPI */}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <div
                            key={stat.title}
                            className="rounded-3xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                                <Icon
                                    size={22}
                                    className="text-violet-400"
                                />
                            </div>

                            <h2 className="mt-6 text-4xl font-bold text-white">
                                {stat.value}
                            </h2>

                            <p className="mt-2 text-zinc-500">
                                {stat.title}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Search & Filters */}

            <section className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Search */}

                    <div className="relative w-full lg:max-w-md">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                        />

                        <input
                            type="text"
                            placeholder="Search gigs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] py-3 pl-11 pr-4 text-white outline-none transition focus:border-violet-500"
                        />
                    </div>

                    {/* Status Filters */}

                    <div className="flex flex-wrap gap-2">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${activeFilter === filter
                                    ? "bg-violet-600 text-white"
                                    : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Gig Cards */}

            <section>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredGigs.map((gig) => (
                        <GigCard key={gig.id} gig={gig} />
                    ))}
                </div>

                {/* Empty State — only reached once loading has actually finished */}

                {filteredGigs.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-[#11111A] px-8 py-20 text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
                            <BriefcaseBusiness
                                size={36}
                                className="text-violet-400"
                            />
                        </div>

                        <h2 className="mt-6 text-2xl font-bold text-white">
                            No Gigs Found
                        </h2>

                        <p className="mx-auto mt-3 max-w-md text-zinc-400">
                            We couldn't find any gigs matching your search or filters.
                            Try changing the filters or browse available gigs.
                        </p>

                        <Link
                            to="/marketplace"
                            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
                        >
                            Browse More Gigs

                            <ArrowRight size={18} />
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}