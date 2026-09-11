import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Users,
  CheckCircle,
  Pencil,
  Pause,
  Play,
  Download,
  Trash2,
  X,
  Wallet,
  Globe,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaYoutube, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import Breadcrumbs from "../../components/Breadcrumbs";
import ConfirmModal from "./components/ConfirmModal";
import ViewsChart from "../Brand/Components/ViewsChart";
import PayoutChart from "../Brand/Components/PayoutChart";
import { api } from "../../lib/api";
import useToast from "../../hooks/useToast";

const PLATFORM_ICONS = {
  YouTube: { icon: FaYoutube, color: "text-red-500" },
  Instagram: { icon: FaInstagram, color: "text-pink-500" },
  Facebook: { icon: FaFacebook, color: "text-blue-500" },
  X: { icon: FaXTwitter, color: "text-white" },
};

const KPI_ACCENTS = {
  violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400", border: "hover:border-violet-500/30" },
  cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400", border: "hover:border-cyan-500/30" },
  blue: { iconBg: "bg-blue-500/10", iconText: "text-blue-400", border: "hover:border-blue-500/30" },
  green: { iconBg: "bg-green-500/10", iconText: "text-green-400", border: "hover:border-green-500/30" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400", border: "hover:border-amber-500/30" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400", border: "hover:border-emerald-500/30" },
};

const formatCompact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const formatMoney = (n) => `\u20B9${formatCompact(n)}`;

export default function CreatorGigDetails() {
  const { id: accessKey } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [gig, setGig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [status, setStatus] = useState("Active");
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportState, setExportState] = useState("idle");
  const [chartFilter, setChartFilter] = useState("30D");
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementOption, setSettlementOption] = useState(null);
  const [newSettlementDeadline, setNewSettlementDeadline] = useState(null);
  const [isSettlingFunds, setIsSettlingFunds] = useState(false);

  const parseCurrencyValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(String(value).replace(/[₹,\s]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const chartData = useMemo(() => {
    const asNumber = (value) => {
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;
      if (typeof value === "string") {
        const cleaned = value.replace(/[₹,\s]/g, "");
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const buildTimeBuckets = (filterKey, valueKey) => {
      const today = new Date();
      const labels = [];

      if (filterKey === "7D") {
        for (let i = 6; i >= 0; i -= 1) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          labels.push({ key: date.toISOString().slice(0, 10), label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
        }
      } else if (filterKey === "30D") {
        for (let i = 3; i >= 0; i -= 1) {
          const start = new Date(today);
          start.setDate(today.getDate() - (i * 7 + 6));
          const end = new Date(today);
          end.setDate(today.getDate() - (i * 7));
          labels.push({
            key: `${start.toISOString().slice(0, 10)}:${end.toISOString().slice(0, 10)}`,
            label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          });
        }
      } else if (filterKey === "6M") {
        for (let i = 5; i >= 0; i -= 1) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          labels.push({ key: date.toISOString().slice(0, 7), label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) });
        }
      } else {
        const baseYears = [2024, 2025, 2026];
        baseYears.forEach((year) => {
          labels.push({ key: String(year), label: String(year) });
        });
      }

      const bucketMap = new Map(labels.map((entry) => [entry.key, 0]));
      const dateSources = participants.filter((participant) => participant.createdAt || participant.created_at);

      dateSources.forEach((participant) => {
        const rawDate = participant.createdAt || participant.created_at;
        const value = valueKey === "views" ? Number(participant.views || 0) : asNumber(participant.earned || 0);
        if (!rawDate || value <= 0) return;

        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) return;

        let bucketKey = null;

        if (filterKey === "7D") {
          bucketKey = date.toISOString().slice(0, 10);
        } else if (filterKey === "30D") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
          bucketKey = `${weekStart.toISOString().slice(0, 10)}:${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`;
        } else if (filterKey === "6M") {
          bucketKey = date.toISOString().slice(0, 7);
        } else {
          bucketKey = String(date.getFullYear());
        }

        if (bucketMap.has(bucketKey)) {
          bucketMap.set(bucketKey, bucketMap.get(bucketKey) + value);
        }
      });

      return labels.map((entry) => ({
        period: entry.label,
        [valueKey]: bucketMap.get(entry.key) || 0,
      }));
    };

    return {
      views: buildTimeBuckets(chartFilter, "views"),
      payout: buildTimeBuckets(chartFilter, "payout"),
    };
  }, [chartFilter, participants]);

  useEffect(() => {
    let mounted = true;
    if (!accessKey) {
      setPageError("This gig link is invalid.");
      setPageLoading(false);
      return () => { mounted = false; };
    }

    (async () => {
      try {
        setPageLoading(true);
        // Use unified campaign endpoint for gigs
        const data = await api(`/api/content/campaigns/${accessKey}/`);
        if (!mounted) return;
        setGig(data);
        setStatus(data.status?.charAt(0).toUpperCase() + data.status?.slice(1) || "Draft");

        // Fetch participants for this gig
        try {
          const participantsData = await api(`/api/content/campaigns/${data.accessKey || accessKey}/participants/`);
          if (!mounted) return;
          setParticipants(participantsData || []);
        } catch (err) {
          console.warn('Failed to load participants:', err);
          setParticipants([]);
        }

        setPageError("");
      } catch (err) {
        if (!mounted) return;
        setPageError(err?.message || "Unable to load gig details.");
      } finally {
        if (mounted) setPageLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [accessKey]);

  if (pageLoading) {
    return (
      <div className="space-y-8">
        <Link to="/creator/gigs" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white">
          <ArrowLeft size={18} /> Back to Gigs
        </Link>
        <div className="animate-pulse space-y-6">
          <div className="h-48 rounded-3xl bg-white/5" />
          <div className="h-32 rounded-3xl bg-white/5" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="space-y-8">
        <Link to="/creator/gigs" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white">
          <ArrowLeft size={18} /> Back to Gigs
        </Link>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{pageError}</div>
      </div>
    );
  }

  const isActive = status === "Active";
  const isClosed = String(gig?.status || "").toLowerCase() === "closed";
  const remainingBudget = Math.max(Number(gig?.remainingBudget ?? gig?.remaining_budget ?? (Number(gig?.budget || 0) - Number(gig?.paidOut || gig?.paid_out || 0))), 0);
  const hasSettledRemainingFunds = Boolean(gig?.remainingFundsSettled ?? gig?.remaining_funds_settled ?? false);
  // Use the backend-provided value; fallback to local computation only if needed
  const needsRemainingSettlement = Boolean(gig?.needsRemainingSettlement ?? (isClosed && !hasSettledRemainingFunds && remainingBudget > 0 && (gig?.closureReason || gig?.closure_reason) !== 'budget'));
  const actionDisabled = isClosed;
  const budgetNum = Number(gig?.budget || 0);
  const paidOutNum = Number(gig?.paidOut || gig?.paid_out || 0);  // Try both camelCase and snake_case
  const viewsNum = Number(gig?.views || 0);
  const submissionsCount = Number(gig?.submissions || gig?.submissions_count || 0);  // Try both formats
  const formattedBudget = budgetNum > 0 ? formatMoney(budgetNum) : "\u20B90";
  const formattedPaidOut = paidOutNum > 0 ? formatMoney(paidOutNum) : "\u20B90";
  const formattedViews = viewsNum > 0 ? formatCompact(viewsNum) : "0";

  const kpiCards = [
    { label: "Views Generated", value: formattedViews, icon: Eye, accent: "violet" },
    { label: "Active Clippers", value: participants.length, icon: Users, accent: "cyan" },
    { label: "Submitted Clips", value: submissionsCount, icon: CheckCircle, accent: "blue" },
    { label: "Total Earnings", value: formattedPaidOut, icon: Wallet, accent: "emerald" },
  ];

  const modalConfig = {
    edit: {
      title: "Edit this Gig?",
      description: "You'll be taken to the edit form to update this gig's details.",
      icon: Pencil,
      color: "blue",
      confirmText: "Continue to Edit",
    },
    delete: {
      title: "Close this Gig?",
      description: `"${gig?.name || gig?.title}" will be closed. If there is remaining budget, you'll need to settle it by extending the deadline or transferring the funds to your wallet.`,
      icon: Trash2,
      color: "red",
      confirmText: "Close",
    },
    pause: {
      title: "Pause this Gig?",
      description: "Creators won't be able to submit new clips until you resume this gig.",
      icon: Pause,
      color: "yellow",
      confirmText: "Pause",
    },
    resume: {
      title: "Resume this Gig?",
      description: "Creators will be able to submit clips again.",
      icon: Play,
      color: "green",
      confirmText: "Resume",
    },
    export: {
      title: "Export Gig Report?",
      description: "A CSV report containing participants, views and payouts will be downloaded.",
      icon: Download,
      color: "blue",
      confirmText: "Export",
    },
  };

  const handlePauseResume = async () => {
    if (actionDisabled) return;
    setActionLoading(true);
    try {
      const nextStatus = isActive ? "paused" : "active";
      // Use unified campaign endpoint for gigs
      await api(`/api/content/campaigns/${gig.id}/`, { method: "PATCH", body: { status: nextStatus } });
      setStatus(isActive ? "Paused" : "Active");
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async () => {
    if (actionDisabled) {
      setConfirmAction(null);
      return;
    }
    setActionLoading(true);
    try {
      // Use the close endpoint which sets closure_reason to 'manual'
      await api(`/api/content/campaigns/${gig.id}/close/`, {
        method: "POST", 
      });
      // Reload to show the settlement modal if there's remaining budget
      const updatedGig = await api(`/api/content/campaigns/${gig.id}/`);
      setGig(updatedGig);
      setConfirmAction(null);
    } catch (err) {
      console.error("Failed to close gig", err);
      alert(err.message || "Unable to close gig.");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleExport = () => {
    setExportState("exporting");
    setConfirmAction(null);

    try {
      const header = ["Username", "Platform", "Views", "Status", "Payout"];
      const rows = participants.map((c) => [c.username, c.platform, c.views, c.status, c.earnings]);
      const csv = [header, ...rows].map((row) => row.join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (gig?.name || gig?.title || "gig").replace(/\s+/g, "-").toLowerCase();
      link.download = `${safeName}-gig-report.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }

    setExportState("done");
    setTimeout(() => setExportState("idle"), 1800);
  };

  const handleExtendDeadlineSettlement = async () => {
    if (!newSettlementDeadline) {
      showToast({ type: "warning", message: "Please choose a new deadline date." });
      return;
    }

    setIsSettlingFunds(true);
    try {
      await api(`/api/content/campaigns/${gig.id}/extend-deadline/`, {
        method: "POST",
        body: { endDate: newSettlementDeadline },
      });

      const refreshed = await api(`/api/content/campaigns/${gig.id}/`);
      setGig(refreshed);
      setStatus(String(refreshed?.status || "active").toLowerCase() === "active" ? "Active" : "Paused");
      setIsSettlementModalOpen(false);
      setSettlementOption(null);
      setNewSettlementDeadline(null);
      showToast({ type: "success", message: "Gig deadline extended successfully." });
    } catch (error) {
      console.error("Failed to extend settlement deadline", error);
      showToast({ type: "error", message: error.message || "Unable to extend the deadline." });
    } finally {
      setIsSettlingFunds(false);
    }
  };

  const handleTransferRemainingFunds = async () => {
    setIsSettlingFunds(true);
    try {
      await api(`/api/content/campaigns/${gig.id}/transfer-remaining-funds/`, { method: "POST" });

      const refreshed = await api(`/api/content/campaigns/${gig.id}/`);
      setGig(refreshed);
      setIsSettlementModalOpen(false);
      setSettlementOption(null);
      setNewSettlementDeadline(null);
      showToast({ type: "success", message: "Remaining funds transferred to your wallet." });
    } catch (error) {
      console.error("Failed to transfer remaining funds", error);
      showToast({ type: "error", message: error.message || "Unable to transfer remaining funds." });
    } finally {
      setIsSettlingFunds(false);
    }
  };

  const handleEditConfirmed = () => {
    if (actionDisabled) {
      setConfirmAction(null);
      return;
    }
    setConfirmAction(null);
    navigate(`/creator/gigs/${gig.id}/edit`);
  };

  return (
    <div className="space-y-8">
      <ConfirmModal
        open={!!confirmAction}
        title={modalConfig[confirmAction]?.title}
        description={modalConfig[confirmAction]?.description}
        icon={modalConfig[confirmAction]?.icon}
        color={modalConfig[confirmAction]?.color}
        confirmText={modalConfig[confirmAction]?.confirmText}
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          switch (confirmAction) {
            case "edit":
              handleEditConfirmed();
              break;
            case "delete":
              handleDelete();
              break;
            case "pause":
            case "resume":
              handlePauseResume();
              break;
            case "export":
              handleExport();
              break;
          }
        }}
      />
      <Breadcrumbs overrides={{ Campaign: gig?.name || gig?.title }} />

      <Link
        to="/creator/gigs"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Gigs
      </Link>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/10 via-[#11111A] to-[#0B0B12] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div>

            <h1 className="mt-4 text-4xl font-bold text-white">{gig?.name || gig?.title}</h1>

            <p className="mt-4 max-w-2xl text-zinc-400">{gig?.description || "No description provided."}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => !actionDisabled && setConfirmAction("edit")}
              disabled={actionDisabled}
              title={actionDisabled ? "This gig is closed and cannot be edited." : "Edit this gig"}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-white transition hover:border-violet-500/30 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={16} />
              Edit
            </button>

            <button
              onClick={() => !actionDisabled && setConfirmAction(isActive ? "pause" : "resume")}
              disabled={actionDisabled}
              title={actionDisabled ? "This gig is closed and cannot be paused or resumed." : isActive ? "Pause this gig" : "Resume this gig"}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${isActive
                  ? "border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                  : "border-green-500/20 text-green-400 hover:bg-green-500/10"
                } ${actionDisabled ? "border-white/10 text-zinc-500" : ""}`}
            >
              {isActive ? <Pause size={16} /> : <Play size={16} />}
              {actionDisabled ? "Closed" : isActive ? "Pause" : "Resume"}
            </button>

            <button
              onClick={() => !actionDisabled && setConfirmAction("delete")}
              disabled={actionDisabled}
              title={actionDisabled ? "This gig is closed and cannot be closed again." : "Close this gig"}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
              Close
            </button>

            <button
              onClick={() => setConfirmAction("export")}
              disabled={exportState === "exporting"}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-white transition hover:border-violet-500/30 hover:bg-white/[0.03] disabled:opacity-60"
            >
              <Download size={16} />
              {exportState === "exporting" ? "Exporting\u2026" : exportState === "done" ? "Exported" : "Export"}
            </button>
          </div>
        </div>
      </section>

      {needsRemainingSettlement && (
        <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-400">!</div>
              <div>
                <h3 className="text-lg font-semibold text-white">Remaining budget settlement required</h3>
                <p className="mt-1 text-sm text-red-200">
                  This gig is closed and has <span className="font-semibold">₹{Number(remainingBudget).toLocaleString("en-IN")}</span> remaining. Please settle it by transferring the balance back to your wallet.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewSettlementDeadline(null);
                setSettlementOption(null);
                setIsSettlementModalOpen(true);
              }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
            >
              Settle now
            </button>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Gig Overview</h2>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-zinc-500">Budget</p>
            <p className="mt-2 text-xl font-semibold text-white">{formattedBudget}</p>
          </div>

          <div>
            <p className="text-zinc-500">Reward / 1K Views</p>
            <p className="mt-2 text-xl font-semibold text-white">{gig?.rewardPer1k ? `₹${Number(gig.rewardPer1k).toLocaleString()}` : "—"}</p>
          </div>

          <div>
            <p className="text-zinc-500">Platforms</p>
            <div className="mt-2 flex items-center gap-4 text-2xl">
              {(gig?.platforms || ["YouTube"]).map((name) => {
                const { icon: Icon, color } = PLATFORM_ICONS[name] || { icon: Globe, color: "text-white" };
                return (
                  <Icon
                    key={name}
                    title={name}
                    className={`${color} transition-transform hover:scale-110`}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-zinc-500">Gig Status</p>
            <p className={`mt-2 text-xl font-semibold ${isActive ? "text-green-400" : "text-yellow-400"}`}>
              {status}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Requirements</h2>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
          {gig?.clipperRequirements ? (
            <p className="text-zinc-300 whitespace-pre-wrap">{gig.clipperRequirements}</p>
          ) : (
            <p className="text-zinc-500">No requirements specified.</p>
          )}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((item) => {
          const Icon = item.icon;
          const a = KPI_ACCENTS[item.accent];

          return (
            <div
              key={item.label}
              className={`rounded-2xl border border-white/10 bg-[#11111A] p-5 transition ${a.border}`}
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                <Icon size={17} className={a.iconText} />
              </div>

              <h3 className="text-3xl font-bold text-white">{item.value}</h3>

              <p className="mt-1 text-sm text-zinc-500">{item.label}</p>
            </div>
          );
        })}
      </div>



      {/* Gig Participants */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Gig Participants</h2>
            <p className="mt-1 text-zinc-500">Review every creator who has participated in this gig.</p>
          </div>

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2">
            <span className="text-sm font-medium text-violet-400">
              {participants.length} Participants
            </span>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-left text-sm font-medium text-zinc-500">#</th>
                <th className="pb-4 text-left text-sm font-medium text-zinc-500">Username</th>
                <th className="pb-4 text-left text-sm font-medium text-zinc-500">Views</th>
                <th className="pb-4 text-left text-sm font-medium text-zinc-500">Payout</th>
                <th className="pb-4 text-left text-sm font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
                        <Users size={24} className="text-zinc-500" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-base font-semibold text-white">No Participants Yet</h3>
                      <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
                        Once clippers join this gig and submit clips, they'll show up here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                participants.map((participant, idx) => {
                  const participantKey = participant.participantKey;
                  const earningsDisplay = participant.earned || "₹0.00";

                  return (
                    <tr
                      key={participantKey ?? participant.clipperId ?? idx}
                      className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="py-5 font-medium text-white">{idx + 1}</td>
                      <td className="py-5 text-zinc-200">{participant.username || "Unknown"}</td>
                      <td className="py-5 text-white">{participant.views || 0}</td>
                      <td className="py-5 text-white">{earningsDisplay}</td>
                      <td className="py-5">
                        <Link
                          to={`/creator/gigs/${gig.accessKey || accessKey}/participants/${participantKey}`}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-violet-500/30"
                        >
                          View Submissions
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Resources</h2>
        <p className="mt-1 text-zinc-500">Reference material shared with clippers for this gig.</p>

        {gig?.resources && gig.resources.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {gig.resources.map((resource, idx) => (
              <a
                key={resource.id || idx}
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-violet-500/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                    <LinkIcon size={16} className="text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-white">{resource.name}</h3>
                    <p className="truncate text-sm text-zinc-500">{resource.url}</p>
                  </div>
                </div>
                <ExternalLink
                  size={16}
                  className="shrink-0 text-zinc-600 transition group-hover:text-violet-400"
                />
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-zinc-500">No resources have been added to this gig yet.</p>
        )}
      </section>
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Gig Performance</h2>
            <p className="mt-1 text-zinc-500">Track views, payouts and gig efficiency.</p>
          </div>

          <div className="flex gap-2">
            {["7D", "30D", "6M", "ALL"].map((filter) => (
              <button
                key={filter}
                onClick={() => setChartFilter(filter)}
                className={`rounded-xl px-4 py-2 text-sm transition ${filter === chartFilter
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-violet-500/10 bg-gradient-to-br from-violet-600/10 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Views Performance</p>
                <h3 className="mt-3 text-5xl font-bold text-white">{formattedViews}</h3>
                <p className="mt-2 text-green-400">Lifetime total views</p>
              </div>
              <Eye size={32} className="text-violet-400" />
            </div>

            <div className="mt-8 h-[220px] rounded-2xl border border-violet-500/20 bg-[#0B0B12] p-3">
              <ViewsChart data={chartData.views} xKey="period" dataKey="views" />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-600/10 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Payout Performance</p>
                <h3 className="mt-3 text-5xl font-bold text-white">{formattedPaidOut}</h3>
                <p className="mt-2 text-green-400">Total paid out</p>
              </div>
              <Wallet size={32} className="text-emerald-400" />
            </div>

            <div className="mt-8 h-[250px] rounded-2xl border border-emerald-500/20 p-3">
              <PayoutChart data={chartData.payout} xKey="period" dataKey="payout" />
            </div>
          </div>
        </div>
      </section>

      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#11111A] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-red-400">Settlement</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Settle remaining budget</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSettlementModalOpen(false);
                  setSettlementOption(null);
                  setNewSettlementDeadline(null);
                }}
                className="rounded-full border border-white/10 p-2 text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-300">Remaining budget</p>
              <p className="mt-2 text-3xl font-bold text-white">₹{Number(remainingBudget).toLocaleString("en-IN")}</p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setSettlementOption("extend")}
                className={`w-full rounded-2xl border p-4 text-left transition ${settlementOption === "extend" ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
              >
                <p className="font-semibold text-white">Extend deadline</p>
                <p className="mt-1 text-sm text-zinc-400">Give more time for submissions and keep the gig active.</p>
              </button>

              {settlementOption === "extend" && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <label className="mb-2 block text-sm text-zinc-300">Choose new deadline</label>
                  <input
                    type="date"
                    value={newSettlementDeadline || ""}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(event) => setNewSettlementDeadline(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0B0B12] px-3 py-2 text-white"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setSettlementOption("transfer")}
                className={`w-full rounded-2xl border p-4 text-left transition ${settlementOption === "transfer" ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
              >
                <p className="font-semibold text-white">Transfer to wallet</p>
                <p className="mt-1 text-sm text-zinc-400">Move the remaining balance to your wallet immediately.</p>
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSettlementModalOpen(false);
                  setSettlementOption(null);
                  setNewSettlementDeadline(null);
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-white transition hover:border-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={settlementOption === "extend" ? handleExtendDeadlineSettlement : handleTransferRemainingFunds}
                disabled={isSettlingFunds || !settlementOption || (settlementOption === "extend" && !newSettlementDeadline)}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSettlingFunds ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
