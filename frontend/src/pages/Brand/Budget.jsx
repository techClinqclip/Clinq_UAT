import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, Wallet, PieChart, TrendingUp, ArrowRight } from "lucide-react";
import PayoutTrendChart from "./PayoutTrendChart";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";
import ContentLoader from "../../shared/ui/ContentLoader";

const STAT_ACCENTS = {
  violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
  cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
};

const FILTERS = ["7D", "30D", "6M", "ALL"];

const formatMoneyValue = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const formatPercentValue = (value) => `${Number(value || 0).toFixed(1)}%`;

function TransactionCard({ transaction }) {
  const navigate = useNavigate();
  const open = () => navigate(`/brand/campaigns/${transaction.campaignId}`);

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
      className="group relative cursor-pointer rounded-2xl border border-white/10 p-4 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.02] hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-white">{transaction.username}</h3>
          <p className="mt-0.5 truncate text-sm text-zinc-500">
            {transaction.campaign} · {transaction.date}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-violet-400">{transaction.amount}</p>
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
            {transaction.status}
          </span>
        </div>
      </div>

      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
            <span className="text-xs text-zinc-500">
              Transaction ID: TXN-{String(transaction.id).padStart(4, "0")}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-violet-400">
              View Campaign
              <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Budget() {
  const [budgetData, setBudgetData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("30D");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api("/api/content/campaigns/budget/"),
      api("/api/content/campaigns/"),
    ])
      .then(([budgetData, campaignData]) => {
        if (!mounted) return;
        setBudgetData(budgetData || null);
        setCampaigns(Array.isArray(campaignData) ? campaignData : campaignData?.results || []);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Budget page load failed", err);
        setError(err.message || "Unable to load budget data.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Header rendered up front, before the loading/error early-returns, so
  // the page shell (title, breadcrumbs) stays visible instead of
  // disappearing entirely while data is in flight.
  const header = (
    <div>
      <Breadcrumbs />
      <h1 className="text-4xl font-bold text-white">Budget</h1>
      <p className="mt-2 text-zinc-400">Track spending, payouts and campaign budget utilization.</p>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {header}
        <ContentLoader message="Loading budget data..." minHeight={400} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        {header}
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-400">
          {error}
        </div>
      </div>
    );
  }

  const data = budgetData || {
    total_budget: 0,
    total_spent: 0,
    active_budget: 0,
    avg_payout: 0,
    utilization: 0,
    campaign_budgets: [],
    payout_by_period: { "7D": [], "30D": [], "6M": [], ALL: [] },
  };

  const stats = [
    {
      title: "Active Budget",
      value: `₹${Number(data.active_budget || 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      accent: "violet",
    },
    {
      title: "Spent",
      value: `₹${Number(data.total_spent || 0).toLocaleString("en-IN")}`,
      icon: Wallet,
      accent: "amber",
    },
    {
      title: "Avg Payout",
      value: `₹${Number(data.avg_payout || 0).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      accent: "emerald",
    },
    {
      title: "Utilization",
      value: `${Number(data.utilization || 0).toFixed(1)}%`,
      icon: PieChart,
      accent: "cyan",
    },
  ];

  const campaignBudgets = (data.campaign_budgets || []).slice(0, 10);

  const transactions = (campaigns || [])
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 3)
    .map((campaign) => {
      const amount = Number(campaign.paidOut || 0);
      const updatedAt = campaign.updatedAt || campaign.createdAt;
      const date = updatedAt
        ? new Date(updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : "—";
      const brandName = campaign.brandName || "Brand";
      return {
        id: campaign.id,
        username: brandName,
        campaign: campaign.name || "Untitled campaign",
        campaignId: campaign.id,
        amount: `₹${Number(amount).toLocaleString("en-IN")}`,
        date,
        status: amount > 0 ? "Paid" : "Pending",
      };
    });

  const activePayoutData = (data.payout_by_period || {})[filter] || [];
  const totalPaid = activePayoutData.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="space-y-8">
      {header}

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const a = STAT_ACCENTS[stat.accent];
          return (
            <div key={stat.title} className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.iconBg}`}>
                <Icon size={22} className={a.iconText} />
              </div>
              <h2 className="mt-6 text-4xl font-bold text-white">{stat.value}</h2>
              <p className="mt-2 text-zinc-500">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Payout Distribution Trend */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Payout Overview</p>
            <h3 className="mt-2 text-4xl font-bold text-white">₹{totalPaid.toLocaleString()}</h3>
            <p className="mt-2 text-zinc-500">Payout Distribution Trend · {filter}</p>
          </div>

          <div className="flex gap-2">
            {FILTERS.map((period) => (
              <button
                key={period}
                onClick={() => setFilter(period)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  filter === period
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0B0B12] p-4">
          <PayoutTrendChart data={activePayoutData} />
        </div>
      </section>

      {/* Campaign Budget Tracking */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Campaign Budget Tracking</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Campaigns with remaining budget. Fully spent campaigns are hidden here.
        </p>

        <div className="mt-6 max-h-[22rem] space-y-5 overflow-y-auto pr-2">
          {campaignBudgets.length === 0 ? (
            <p className="text-sm text-zinc-500">No campaigns with remaining budget right now.</p>
          ) : (
            campaignBudgets.map((campaign) => {
              const progress = (campaign.spent / campaign.budget) * 100;
              return (
                <div key={campaign.id} className="rounded-2xl border border-white/10 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-semibold text-white">{campaign.name}</h3>
                    <span className="shrink-0 text-violet-400">
                      ₹{campaign.spent.toLocaleString()} / ₹{campaign.budget.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    />
                  </div>

                  <p className="mt-3 text-sm text-zinc-500">{Math.round(progress)}% utilized</p>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>

        <div className="mt-6 space-y-3">
          {transactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </section>
    </div>
  );
}