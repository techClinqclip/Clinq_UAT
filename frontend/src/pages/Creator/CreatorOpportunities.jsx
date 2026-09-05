import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  IndianRupee,
  FileVideo,
  Play,
  Bookmark,
  Smartphone,
  Dumbbell,
  LineChart,
  Gamepad2,
} from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";



const initialOpportunities = [
  {
    id: 1,
    title: "Wireless Earbuds UGC",
    category: "Tech",
    icon: Smartphone,
    accent: "cyan",
    brand: "SoundMax",
    thumbnail: "https://picsum.photos/seed/opp-earbuds/600/400",
    reward: 2500,
    deliverables: "5 Videos",
    totalDays: 14,
    daysLeft: 7,
  },
  {
    id: 2,
    title: "Protein Powder Review",
    category: "Fitness",
    icon: Dumbbell,
    accent: "amber",
    brand: "FitFuel",
    thumbnail: "https://picsum.photos/seed/opp-protein/600/400",
    reward: 4000,
    deliverables: "3 Videos",
    totalDays: 20,
    daysLeft: 12,
  },
  {
    id: 3,
    title: "Finance App Testimonial",
    category: "Finance",
    icon: LineChart,
    accent: "emerald",
    brand: "MoneyWise",
    thumbnail: null,
    reward: 3500,
    deliverables: "2 Videos",
    totalDays: 20,
    daysLeft: 4,
  },
  {
    id: 4,
    title: "Gaming Chair Product Demo",
    category: "Gaming",
    icon: Gamepad2,
    accent: "violet",
    brand: "ProSeat",
    thumbnail: "https://picsum.photos/seed/opp-chair/600/400",
    reward: 5000,
    deliverables: "4 Videos",
    totalDays: 15,
    daysLeft: 10,
  },
];

const ACCENTS = {
  cyan: {
    text: "text-cyan-400",
    iconBg: "bg-cyan-500/10",
    cover: "from-cyan-500/25 via-cyan-500/5 to-transparent",
    border: "hover:border-cyan-500/50",
    glow: "hover:shadow-cyan-500/20",
    chip: "bg-cyan-500/10 text-cyan-300",
  },
  amber: {
    text: "text-amber-400",
    iconBg: "bg-amber-500/10",
    cover: "from-amber-500/25 via-amber-500/5 to-transparent",
    border: "hover:border-amber-500/50",
    glow: "hover:shadow-amber-500/20",
    chip: "bg-amber-500/10 text-amber-300",
  },
  emerald: {
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    cover: "from-emerald-500/25 via-emerald-500/5 to-transparent",
    border: "hover:border-emerald-500/50",
    glow: "hover:shadow-emerald-500/20",
    chip: "bg-emerald-500/10 text-emerald-300",
  },
  violet: {
    text: "text-violet-400",
    iconBg: "bg-violet-500/10",
    cover: "from-violet-500/25 via-violet-500/5 to-transparent",
    border: "hover:border-violet-500/50",
    glow: "hover:shadow-violet-500/20",
    chip: "bg-violet-500/10 text-violet-300",
  },
};

// Urgency coloring is independent of the card's accent — time pressure
// should read the same regardless of category.
const URGENCY = {
  low: { bar: "bg-emerald-400", text: "text-emerald-400" },
  medium: { bar: "bg-amber-400", text: "text-amber-400" },
  high: { bar: "bg-red-400", text: "text-red-400" },
};

const getUrgency = (elapsedPct) => (elapsedPct >= 75 ? "high" : elapsedPct >= 50 ? "medium" : "low");

const FILTERS = ["All", "Tech", "Finance", "Fitness", "Gaming"];

function OpportunityCard({ opportunity, isSaved, onToggleSave }) {
  const { title, category, icon: Icon, accent, brand, thumbnail, reward, deliverables, totalDays, daysLeft } =
    opportunity;
  const navigate = useNavigate();
  const a = ACCENTS[accent];

  const elapsedPct = Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100));
  const urgency = URGENCY[getUrgency(elapsedPct)];

  const open = () => navigate(`/creator/opportunities/${opportunity.id}`);

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
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl shadow-transparent transition-all duration-300 ease-out hover:z-10 hover:-translate-y-3 hover:scale-[1.03] hover:shadow-black/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${a.border} ${a.glow}`}
    >
      {/* Cover */}
      <div className="relative h-36 overflow-hidden sm:h-40">
        {thumbnail ? (
          <>
            <img
              src={thumbnail}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
            <div
              className={`absolute inset-0 bg-gradient-to-t ${a.cover} opacity-0 transition-opacity duration-300 group-hover:opacity-60`}
            />
            <div className="absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
                <Play size={16} className="ml-0.5 fill-white text-white" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${a.cover}`} />
            <Icon
              size={110}
              strokeWidth={1}
              className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
            />
          </>
        )}

        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${a.chip}`}>
              <Icon size={12} />
              {category}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">{title}</h3>
            <p className="mt-0.5 text-xs text-zinc-300 drop-shadow-sm">{brand}</p>
          </div>
        </div>


        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(opportunity.id);
          }}
          className={`absolute bottom-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-300 ${
            isSaved
              ? "border-white/30 bg-white/20 text-white opacity-100"
              : "scale-75 border-white/20 bg-black/40 text-white opacity-0 group-hover:scale-100 group-hover:opacity-100"
          }`}
        >
          <Bookmark size={13} className={isSaved ? "fill-white" : ""} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-5">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
            <IndianRupee size={15} className={a.text} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Reward</p>
            <p className="truncate text-base font-bold text-green-400">₹{reward.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
            <FileVideo size={15} className={a.text} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Deliverables</p>
            <p className="truncate text-base font-bold text-white">{deliverables}</p>
          </div>
        </div>
      </div>

      {/* Deadline urgency = % of the window elapsed, colored by urgency */}
      <div className="px-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-zinc-500">{daysLeft} days left</span>
          <span className={`font-semibold ${urgency.text}`}>{elapsedPct}% elapsed</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full ${urgency.bar} transition-all duration-500`}
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
      </div>

      {/* Actions — collapsed by default on desktop, expands on hover/focus */}
      <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-within:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="mt-5 border-t border-white/5 p-5 pt-5">
            <Link
              to={`/creator/opportunities/${opportunity.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-violet-500"
            >
              View Opportunity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatorOpportunities() {
  const [opportunities] = useState(initialOpportunities);
  const [savedIds, setSavedIds] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const toggleSave = (id) =>
    setSavedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));

  const filtered = opportunities.filter((o) => {
    const matchesFilter = filter === "All" || o.category === filter;
    const matchesSearch = o.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <Breadcrumbs />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="relative z-10">
          <p className="text-sm uppercase tracking-[0.25em] text-violet-400">UGC Marketplace</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Earn Through UGC</h1>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Join brand campaigns, create content, submit videos and earn rewards.
          </p>
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search opportunities..."
          className="w-full rounded-2xl border border-white/10 bg-[#11111A] py-3 pl-11 pr-4 text-white outline-none focus:border-violet-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-violet-600 text-white"
                : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Opportunities Grid */}
      <div className="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.length > 0 ? (
          filtered.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              isSaved={savedIds.includes(opportunity.id)}
              onToggleSave={toggleSave}
            />
          ))
        ) : (
          <p className="col-span-full py-12 text-center text-zinc-500">
            No opportunities match your search or filter.
          </p>
        )}
      </div>
    </div>
  );
}