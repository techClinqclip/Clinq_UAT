import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Users,
  CheckCircle,
  Clock,
  IndianRupee,
  Pencil,
  Pause,
  Play,
  Download,
  Trash2,
  Wallet,
  Globe,
  X,
  Link as LinkIcon,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../lib/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaYoutube, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import ViewsChart from "./Components/ViewsChart";
import PayoutChart from "./Components/PayoutChart";
import Breadcrumbs from "../../components/Breadcrumbs";
import ContentLoader from "../../shared/ui/ContentLoader";
import ConfirmModal from "../../shared/ui/ComfirmModal";
import useToast from "../../hooks/useToast";

const formatCompactNumber = (value) => {
  const numeric = Number(value || 0);
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(numeric);
};

const formatIndianCurrency = (value) => {
  const num = Number(value || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 1)}Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
  }
  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
  }
  return `₹${num}`;
};
const DEFAULT_CAMPAIGN = {
  id: null,
  name: "Campaign",
  status: "active",
  description: "",
  budget: 0,
  rewardPer1k: 0,
  views: 0,
  submissions: 0,
  paidOut: 0,
  platforms: [],
  resources: [],
};

const PLATFORM_ICONS = {
  YouTube: { icon: FaYoutube, color: "text-red-500" },
  Instagram: { icon: FaInstagram, color: "text-pink-500" },
  Facebook: { icon: FaFacebook, color: "text-blue-500" },
  X: { icon: FaXTwitter, color: "text-white" },
};

const clippers = [
  { id: 1, username: "@rahul_editz", platform: "YouTube", views: "125K", status: "Submitted", earned: "₹2,500" },
  { id: 2, username: "@aman_clips", platform: "Instagram", views: "82K", status: "Pending", earned: "₹1,400" },
  { id: 3, username: "@priya_media", platform: "YouTube", views: "210K", status: "Submitted", earned: "₹4,200" },
];

const resources = [
  { id: 1, name: "Episode raw footage", url: "https://drive.google.com/example-footage" },
  { id: 2, name: "Brand guidelines", url: "https://drive.google.com/example-guidelines" },
];

// Character count past which the hero description is treated as "long"
// enough to warrant the "Read full description in Edit" hint under the
// clamped text. Rough heuristic, not a measured overflow check — good
// enough since we're clamping to 2 lines of a fairly wide max-w-2xl block.
const DESCRIPTION_HINT_THRESHOLD = 140;

const PARTICIPANT_STATUS_STYLE = {
  submitted: "bg-emerald-500/10 text-emerald-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  rejected: "bg-rose-500/10 text-rose-400",
};
const participantStatusClass = (status) =>
  PARTICIPANT_STATUS_STYLE[String(status || "").toLowerCase()] || "bg-zinc-500/10 text-zinc-400";

// KPI grid now sized to match the actual 3 cards (was xl:grid-cols-6,
// which left half the row empty and made the cards look lopsided).
// If more KPIs get added later, bump these breakpoints to match the
// new count rather than leaving a mismatch again.
const KPI_ACCENTS = {
  violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400", border: "hover:border-violet-500/30" },
  cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400", border: "hover:border-cyan-500/30" },
  blue: { iconBg: "bg-blue-500/10", iconText: "text-blue-400", border: "hover:border-blue-500/30" },
  green: { iconBg: "bg-green-500/10", iconText: "text-green-400", border: "hover:border-green-500/30" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400", border: "hover:border-amber-500/30" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400", border: "hover:border-emerald-500/30" },
};

export default function CampaignDetails() {
  const navigate = useNavigate();
  const { id: accessKey } = useParams();
  const { showToast } = useToast();
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPauseConfirmOpen, setIsPauseConfirmOpen] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementOption, setSettlementOption] = useState(null);
  const [newSettlementDeadline, setNewSettlementDeadline] = useState(null);
  const [isSettlingFunds, setIsSettlingFunds] = useState(false);
  const [exportState, setExportState] = useState("idle");
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [filter, setFilter] = useState("30D");

  const status = campaign?.status || "active";
  const isActive = String(status).toLowerCase() === "active";
  const activeViewsData = performanceData?.views_by_period?.[filter] || [];
  const activePayoutData = performanceData?.payout_by_period?.[filter] || [];
  const totalViews = Number(performanceData?.total_views || 0);
  const totalPayout = Number(performanceData?.total_payout || 0);
  const clippersPaid = Number(performanceData?.clippers_paid || 0);

  useEffect(() => {
    if (!accessKey) {
      setLoadError("This campaign link is invalid.");
      setIsLoading(false);
      return undefined;
    }

    const loadCampaign = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await api(`/api/content/campaigns/${accessKey}/`);
        setCampaign(data);
      } catch (error) {
        console.error("Failed to load campaign", error);
        setLoadError(error.message || "Unable to load campaign.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaign();
  }, [accessKey]);

  useEffect(() => {
    const loadParticipants = async () => {
      setParticipantsLoading(true);
      try {
        const data = await api(`/api/content/campaigns/${campaign.id}/participants/`);
        setParticipants(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load participants", error);
        setParticipants([]);
      } finally {
        setParticipantsLoading(false);
      }
    };

    const loadPerformance = async () => {
      setPerformanceLoading(true);
      try {
        const data = await api(`/api/content/campaigns/${campaign.id}/performance/`);
        setPerformanceData(data || null);
      } catch (error) {
        console.error("Failed to load campaign performance", error);
        setPerformanceData(null);
      } finally {
        setPerformanceLoading(false);
      }
    };

    if (campaign?.id) {
      loadParticipants();
      loadPerformance();
    }
  }, [campaign?.id]);

  // Pause/Resume now goes through the same confirm-then-wait flow as
  // Delete instead of updating optimistically — the button just opens
  // the modal; this is what actually calls the API once confirmed.
  const handleTogglePauseConfirmed = async () => {
    if (!campaign || actionLocked) return;
    const nextStatus = isActive ? "paused" : "active";

    setIsTogglingPause(true);
    try {
      await api(`/api/content/campaigns/${campaign.id}/`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      setCampaign((current) => ({ ...current, status: nextStatus }));
      setIsPauseConfirmOpen(false);
    } catch (error) {
      console.error("Failed to update campaign status", error);
      alert(error.message || "Unable to update campaign status.");
    } finally {
      setIsTogglingPause(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (actionLocked) {
      setIsDeleteOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      // Use the close endpoint which sets closure_reason to 'manual'
      await api(`/api/content/campaigns/${campaign.id}/close/`, {
        method: "POST",
      });
      setIsDeleteOpen(false);
      // Reload to show the settlement modal if there's remaining budget
      const updatedCampaign = await api(`/api/content/campaigns/${campaign.id}/`);
      setCampaign(updatedCampaign);
    } catch (error) {
      console.error("Failed to close campaign", error);
      alert(error.message || "Unable to close campaign.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit is non-destructive, but it does take you off this page and into
  // a form that can change real campaign data — same "confirm before you
  // leave/act" convention as Pause and Delete, just without a loading
  // state since there's no API call here, only a navigation.
  const handleEditConfirm = () => {
    if (actionLocked) {
      setIsEditConfirmOpen(false);
      return;
    }
    setIsEditConfirmOpen(false);
    navigate(`/brand/campaigns/${campaign.id}/edit`);
  };

  const handleExport = () => {
    setExportState("exporting");

    const header = ["Username", "Platform", "Views", "Status", "Payout"];
    const rows = (participants || []).map((p) => [p.username, p.platform || "", p.views, p.status, ""]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentCampaign.name.replace(/\s+/g, "-").toLowerCase()}-participants.csv`;
    link.click();
    URL.revokeObjectURL(url);

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
      await api(`/api/content/campaigns/${campaign.id}/extend-deadline/`, {
        method: "POST",
        body: { endDate: newSettlementDeadline },
      });

      const refreshed = await api(`/api/content/campaigns/${campaign.id}/`);
      setCampaign(refreshed);
      setIsSettlementModalOpen(false);
      setSettlementOption(null);
      setNewSettlementDeadline(null);
      showToast({ type: "success", message: "Campaign deadline extended successfully." });
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
      await api(`/api/content/campaigns/${campaign.id}/transfer-remaining-funds/`, {
        method: "POST",
      });

      const refreshed = await api(`/api/content/campaigns/${campaign.id}/`);
      setCampaign(refreshed);
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

  // Breadcrumb + back link rendered up front so they stay visible during
  // loading instead of the whole page disappearing behind plain text.
  const header = (
    <>
      <Breadcrumbs overrides={campaign ? { Campaign: campaign.name } : undefined} />
      <Link to="/brand/campaigns" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white">
        <ArrowLeft size={18} />
        Back to Campaigns
      </Link>
    </>
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        {header}
        <ContentLoader message="Loading campaign details..." minHeight={400} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-8">
        {header}
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-400">
          {loadError}
        </div>
      </div>
    );
  }

  const currentCampaign = campaign || DEFAULT_CAMPAIGN;
  const statusLabel = currentCampaign.status
    ? `${currentCampaign.status[0].toUpperCase()}${currentCampaign.status.slice(1)}`
    : "Active";
  const displayResources = currentCampaign.resources || [];
  const displayPlatforms = currentCampaign.platforms || [];
  const remainingBudget = Number(
    currentCampaign.remainingBudget ??
      currentCampaign.remaining_budget ??
      Math.max(Number(currentCampaign.budget || 0) - Number(currentCampaign.paidOut || 0), 0)
  );
  const closureReason = currentCampaign.closureReason || currentCampaign.closure_reason || "manual";
  const hasSettledRemainingFunds = Boolean(
    currentCampaign.remainingFundsSettled ?? currentCampaign.remaining_funds_settled ?? false
  );
  const needsRemainingSettlement = Boolean(
    currentCampaign.needsRemainingSettlement ??
      (String(currentCampaign.status || "").toLowerCase() === "closed" &&
        remainingBudget > 0 &&
        !hasSettledRemainingFunds &&
        (closureReason !== 'budget'))  // Show for deadline and manual closures, not budget exhaustion
  );
  const isCampaignClosed = String(currentCampaign.status || "").toLowerCase() === "closed";
  const isClosedAndSettled = isCampaignClosed && hasSettledRemainingFunds;
  const actionLocked = isCampaignClosed;
  const formattedBudget = formatIndianCurrency(currentCampaign.budget);
  const formattedReward = formatIndianCurrency(currentCampaign.rewardPer1k);
  const descriptionText =
    currentCampaign.description ||
    "Create engaging clips from your campaign brief and help maximize reach across social platforms.";
  const descriptionIsLong = descriptionText.length > DESCRIPTION_HINT_THRESHOLD;

  const capitalize = (value) =>
    typeof value === "string" && value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

  const kpiCards = [
    { label: "Views", value: currentCampaign.views || 0, icon: Eye, accent: "violet" },
    { label: "Submitted Clips", value: currentCampaign.submissions || 0, icon: CheckCircle, accent: "blue" },
    { label: "Total Payouts", value: currentCampaign.paidOut || 0, icon: IndianRupee, accent: "emerald" },
  ];

  return (
    <div className="space-y-8">
      <ConfirmModal
        open={isDeleteOpen}
        icon={Trash2}
        color="red"
        title="Close this campaign?"
        description={`"${currentCampaign.name}" will be closed. If there is remaining budget, you'll need to settle it by extending the deadline or transferring the funds to your wallet.`}
        confirmText="Close"
        loading={isDeleting}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmModal
        open={isPauseConfirmOpen}
        icon={isActive ? Pause : Play}
        color={isActive ? "yellow" : "green"}
        title={isActive ? "Pause this campaign?" : "Resume this campaign?"}
        description={
          isActive
            ? "Clippers won't be able to submit new clips while this campaign is paused. You can resume anytime."
            : "Clippers will be able to submit clips again once this campaign is resumed."
        }
        confirmText={isActive ? "Pause" : "Resume"}
        loading={isTogglingPause}
        onCancel={() => setIsPauseConfirmOpen(false)}
        onConfirm={handleTogglePauseConfirmed}
      />

      {/* ADJUST "color" if ConfirmModal doesn't recognize "violet" — it's
          only demonstrated above with red/yellow/green, so confirm this
          renders correctly and swap to whatever neutral/info variant
          your ConfirmModal actually supports if not. */}
      <ConfirmModal
        open={isEditConfirmOpen}
        icon={Pencil}
        color="violet"
        title="Edit this campaign?"
        description="You'll be taken to the edit form to update this campaign's details."
        confirmText="Continue to Edit"
        onCancel={() => setIsEditConfirmOpen(false)}
        onConfirm={handleEditConfirm}
      />

<ConfirmModal
        open={isExportConfirmOpen}
        icon={Download}
        color="violet"
        title="Export participants?"
        description="This will download a CSV with all current participant data for this campaign."
        confirmText="Export"
        loading={exportState === "exporting"}
        onCancel={() => setIsExportConfirmOpen(false)}
        onConfirm={() => {
          handleExport();
          setIsExportConfirmOpen(false);
        }}
      />
      {header}

      {/* Hero */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/10 via-[#11111A] to-[#0B0B12] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div>
           

            <h1 className="mt-4 text-4xl font-bold text-white">{currentCampaign.name}</h1>

            <p className="mt-4 max-w-2xl text-zinc-400 line-clamp-2">{descriptionText}</p>

            {descriptionIsLong && (
              <button
                type="button"
                onClick={() => setIsEditConfirmOpen(true)}
                className="mt-2 text-sm font-medium text-violet-400 transition hover:text-violet-300"
              >
                Read full description in Edit
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => !actionLocked && setIsEditConfirmOpen(true)}
              disabled={actionLocked}
              title={actionLocked ? "This campaign is closed and cannot be edited." : "Edit this campaign"}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-white transition hover:border-violet-500/30 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={16} />
              Edit
            </button>

            <button
              onClick={() => !actionLocked && setIsPauseConfirmOpen(true)}
              disabled={actionLocked}
              title={actionLocked ? "This campaign is closed and cannot be paused or resumed." : isActive ? "Pause this campaign" : "Resume this campaign"}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive
                  ? "border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                  : "border-green-500/20 text-green-400 hover:bg-green-500/10"
              } ${actionLocked ? "border-white/10 text-zinc-500" : ""}`}
            >
              {isActive ? <Pause size={16} /> : <Play size={16} />}
              {actionLocked ? "Closed" : isActive ? "Pause" : "Resume"}
            </button>

            <button
              onClick={() => !actionLocked && setIsDeleteOpen(true)}
              disabled={actionLocked}
              title={actionLocked ? "This campaign is closed and cannot be closed again." : "Close this campaign"}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
              Close
            </button>

            <button
              onClick={() => setIsExportConfirmOpen(true)}
              disabled={exportState === "exporting"}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-white transition hover:border-violet-500/30 hover:bg-white/[0.03] disabled:opacity-60"
            >
              <Download size={16} />
              {exportState === "exporting" ? "Exporting…" : exportState === "done" ? "Exported" : "Export"}
            </button>
          </div>
        </div>
      </section>

      {needsRemainingSettlement && (
        <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Remaining budget settlement required</h3>
                <p className="mt-1 text-sm text-red-200">
                  This campaign is closed and has <span className="font-semibold">{formatIndianCurrency(remainingBudget)}</span> remaining.
                  Please settle it by transferring the balance to your wallet or extending the deadline.
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-red-300/80">
                  Reason: {closureReason}
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

      {/* Overview */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Campaign Overview</h2>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-zinc-500">Budget</p>
            <p className="mt-2 text-xl font-semibold text-white">{formattedBudget}</p>
          </div>

          <div>
            <p className="text-zinc-500">Reward / 1K Views</p>
            <p className="mt-2 text-xl font-semibold text-white">{formattedReward}</p>
          </div>

          <div>
            <p className="text-zinc-500">Platforms</p>
            <div className="mt-2 flex items-center gap-4 text-2xl">
              {displayPlatforms.length > 0 ? (
                displayPlatforms.map((name) => {
                  const platformName = capitalize(name);
                  const { icon: Icon, color } = PLATFORM_ICONS[platformName] || { icon: Globe, color: "text-white" };
                  return (
                    <Icon key={name} title={platformName} className={`${color} transition-transform hover:scale-110`} />
                  );
                })
              ) : (
                <span className="text-zinc-500">No platforms selected</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-zinc-500">Campaign Status</p>
            <p className={`mt-2 text-xl font-semibold ${isActive ? "text-green-400" : "text-yellow-400"}`}>
              {capitalize(status)}
            </p>
          </div>
        </div>
      </section>

      {/* KPI Cards — grid now matches the actual card count (3), with a
          bit more visual weight (bigger icon chip, hover lift) so they
          don't look like an afterthought row anymore. */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((item) => {
          const Icon = item.icon;
          const a = KPI_ACCENTS[item.accent];

          return (
            <div
              key={item.label}
              className={`group rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${a.border}`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.iconBg} transition group-hover:scale-105`}>
                <Icon size={20} className={a.iconText} />
              </div>

              <h3 className="mt-4 text-3xl font-bold text-white">
                {typeof item.value === "number" ? item.value.toLocaleString("en-IN") : item.value}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">{item.label}</p>
            </div>
          );
        })}
      </div>

      {/* Clippers */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Campaign Participants</h2>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-left text-zinc-500">#</th>
                <th className="pb-4 text-left text-zinc-500">Username</th>
                <th className="pb-4 text-left text-zinc-500">Views</th>
                <th className="pb-4 text-left text-zinc-500">Payout</th>
                <th className="pb-4 text-left text-zinc-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {participantsLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-zinc-500">
                    Loading participants…
                  </td>
                </tr>
              ) : participants && participants.length > 0 ? (
                participants.map((clipper, idx) => {
                  const userId = clipper.clipperId ?? clipper.id;

                  return (
                    <tr key={userId ?? idx} className="border-b border-white/5">
                      <td className="py-5 font-medium text-white">{idx + 1}</td>
                      <td className="py-5 text-zinc-200">{clipper.username}</td>
                      <td className="py-5 text-white">{clipper.views}</td>
                      <td className="py-5 text-white">{clipper.earned}</td>
                      <td className="py-5">
                        <Link
                          to={`/brand/campaigns/${campaign.id}/clippers/${userId}`}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-violet-500/30"
                        >
                          View Submissions
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
                        <Users size={24} className="text-zinc-500" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-base font-semibold text-white">No Participants Yet</h3>
                      <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
                        Once clippers or creators join this campaign and submit clips, they'll show up here.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    

      {/* Analytics */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Campaign Performance</h2>
            <p className="mt-1 text-zinc-500">Track views, payouts and campaign efficiency.</p>
          </div>

          <div className="flex gap-2">
            {["7D", "30D", "6M", "ALL"].map((period) => (
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

        {performanceLoading ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-[#11111A] p-8 text-sm text-zinc-400">
            Loading campaign performance…
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-violet-500/10 bg-gradient-to-br from-violet-600/10 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Views Performance</p>
                  <h3 className="mt-3 text-5xl font-bold text-white">{formatCompactNumber(totalViews)}</h3>
                  <p className="mt-2 text-green-400">{activeViewsData.length ? `${activeViewsData.reduce((sum, item) => sum + Number(item.views || 0), 0).toLocaleString()} total views in this view` : "No approved views yet"}</p>
                </div>
                <Eye size={32} className="text-violet-400" />
              </div>

              <div className="mt-8 flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-violet-500/20 text-zinc-500">
                <ViewsChart data={activeViewsData} xKey="period" dataKey="views" />
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-600/10 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Payout Performance</p>
                  <h3 className="mt-3 text-5xl font-bold text-white">₹{formatCompactNumber(totalPayout)}</h3>
                  <p className="mt-2 text-green-400">{clippersPaid} clippers paid</p>
                </div>
                <Wallet size={32} className="text-emerald-400" />
              </div>

              <div className="mt-8 h-[250px] rounded-2xl border border-emerald-500/20 p-2">
                <PayoutChart data={activePayoutData} xKey="period" dataKey="payout" />
              </div>
            </div>
          </div>
        )}
      </section>

        {/* Resources */}
        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Resources</h2>
        <p className="mt-1 text-zinc-500">Reference material shared with clippers for this campaign.</p>

        {displayResources.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {displayResources.map((resource) => (
              <a
                key={resource.id || resource.url}
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
                <ExternalLink size={16} className="shrink-0 text-zinc-600 transition group-hover:text-violet-400" />
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-zinc-500">No resources have been added to this campaign yet.</p>
        )}
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
              <p className="mt-2 text-3xl font-bold text-white">{formatIndianCurrency(remainingBudget)}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-yellow-200/80">Reason: {closureReason}</p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setSettlementOption("extend")}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  settlementOption === "extend"
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <p className="font-semibold text-white">Extend deadline</p>
                <p className="mt-1 text-sm text-zinc-400">Give more time for submissions and keep the campaign active.</p>
              </button>

              {settlementOption === "extend" && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <label className="mb-2 block text-sm text-zinc-300">Choose new deadline</label>
                  <input
                    type="date"
                    value={newSettlementDeadline || ""}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setNewSettlementDeadline(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0B0B12] px-3 py-2 text-white"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setSettlementOption("transfer")}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  settlementOption === "transfer"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <p className="font-semibold text-white">Transfer to wallet</p>
                <p className="mt-1 text-sm text-zinc-400">Move the remaining balance to the brand wallet immediately.</p>
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
                onClick={
                  settlementOption === "extend" ? handleExtendDeadlineSettlement : handleTransferRemainingFunds
                }
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