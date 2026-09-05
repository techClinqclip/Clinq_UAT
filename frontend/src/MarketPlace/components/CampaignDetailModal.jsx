import { useState, useEffect } from "react";
import {
  X, Eye, Wallet, TrendingUp, FileVideo, Calendar, CheckCircle2,
  Sparkles, Link2, FileText, ExternalLink,
} from "lucide-react";
import { FaInstagram, FaYoutube, FaXTwitter, FaFacebookF } from "react-icons/fa6";
import { api } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";
import { ACCENTS, formatCompact, formatMoney } from "./campaignUtils";
import SubmitClipDialog from "../../pages/Creator/SubmitClipDialog";
import ProcessingModal from "../../shared/ui/ProcessingModal";
import useToast from "../../hooks/useToast";
const TABS = ["Overview", "Requirements", "Resources"];

const PLATFORM_ICONS = {
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitter: FaXTwitter,
  x: FaXTwitter,
  facebook: FaFacebookF,
};

function plainText(value) {
  if (!value) return "";

  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|ul|ol|h[1-6]|section|article|span|strong|b|em|i|code|pre)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export default function CampaignDetailModal({ isOpen, onClose, campaign }) {
  const [joined, setJoined] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [joinError, setJoinError] = useState("");
  const user = useCurrentUser();

  const [joining, setJoining] = useState(false);
const [joinStepIndex, setJoinStepIndex] = useState(-1);
const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !campaign) return null;

  const {
    id, title, brand = "Brand", category = "Campaign",
    icon: Icon = Sparkles, accent = "violet", status = "Active",
    thumbnail, image,
    views = 0, submissions = 0, budget = 0, paidOut = 0, description, requirements,
    deadline, payoutPerSubmission, platforms = [], resources = [],
  } = campaign;

  const safeDescription = plainText(description || "");
  const safeRequirements = Array.isArray(requirements)
    ? requirements
        .map((req) => plainText(req))
        .flatMap((item) => item.split(/\n|•/))
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const coverImage = thumbnail || image;
  const role = String(user?.role || "").toLowerCase();

  // A creator looking at a campaign they created themselves shouldn't be
  // able to "join" it either — same as a brand viewing their own campaign.
  // The API identifies the campaign's owner by "creatorEmail" (no numeric
  // owner id is sent), so match on that, case-insensitively.
  const ownerEmail = campaign.creatorEmail ?? null;
  const isOwnCampaign = Boolean(user?.email) && Boolean(ownerEmail)
    && String(user.email).toLowerCase() === String(ownerEmail).toLowerCase();

  const canJoin = Boolean(role) && role !== "brand" && !isOwnCampaign;

  const a = ACCENTS[accent] || ACCENTS.violet;
  const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

  const handleClose = () => {
    setJoined(false);
    setShowSubmit(false);
    setJoinError("");
    setJoining(false);
    setJoinStepIndex(-1);
    setActiveTab("Overview");
    onClose();
  };
  const handleJoinCampaign = async () => {
    if (!canJoin) return;
  
    setJoinError("");
    setJoining(true);
    setJoinStepIndex(0);
  
    try {
      await api(`/api/content/campaigns/${id}/join/`, { method: "POST" });
      setJoinStepIndex(1); // marks done -> ProcessingModal fires onComplete
    } catch (error) {
      setJoining(false);
      setJoinStepIndex(-1);
  
      const message = error?.message || "";
      const alreadyJoined = /already joined/i.test(message);
  
      if (alreadyJoined) {
        showToast({
          type: "info",
          message: "You have already joined this campaign/gig.",
        });
      } else {
        setJoinError(message || "Unable to join this campaign right now.");
      }
    }
  };

  const handleSubmitClip = async (payload) => {
    try {
      const response = await api(`/api/content/campaigns/${id}/submit-clip/`, {
        method: "POST",
        body: {
          platform: payload.platform,
          platformUsername: payload.username,
          contentUrl: payload.url,
        },
      });
  
      showToast({
        type: "success",
        title: "Submission Added",
        message: "Your content was submitted successfully.",
      });
  
      setShowSubmit(false);
      handleClose();
  
      return response;
    } catch (error) {
      showToast({
        type: "error",
        title: "Submission failed",
        message: error?.message || "Unable to submit your content. Please try again.",
      });
      throw error; // re-throw so SubmitClipDialog's own catch block resets `submitting`
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={handleClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl"
        >
          {/* Cover */}
          <div className="relative h-48 shrink-0 overflow-hidden sm:h-56">
            {coverImage ? (
              <img src={coverImage} alt={title} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${a.cover}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#11111A] via-black/30 to-black/10" />

            <div className="absolute right-4 top-4 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
              >
                <X size={18} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-6">
              <div>
                <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${a.chip}`}>
                  <Icon size={12} />
                  {category}
                </span>
                <p className="text-sm text-zinc-300">{brand}</p>
                <h2 className="text-2xl font-bold text-white drop-shadow-sm">{title}</h2>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status === "Active" ? "bg-green-500/15 text-green-400" : "bg-zinc-500/15 text-zinc-400"}`}>
                {status}
              </span>
            </div>
          </div>

          {/* Body */}
          {joined ? (
            <div className="flex flex-col items-center gap-4 overflow-y-auto p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">You're In! 🎉</h3>
              <p className="max-w-sm text-sm text-zinc-400">
                You've joined <span className="text-white">{title}</span>. Publish your content, then submit
                the link here to get reviewed and paid.
              </p>
              <div className="mt-2 flex w-full gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
                >
                  Maybe Later
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmit(true)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition ${a.solidBtn}`}
                >
                  Submit Clip Now
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex shrink-0 gap-1 border-b border-white/10 px-7 pt-5">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-4 pb-3 text-sm font-medium transition ${
                      activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab}
                    {tab === "Resources" && resources.length > 0 && (
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${a.chip}`}>
                        {resources.length}
                      </span>
                    )}
                    {activeTab === tab && (
                      <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r ${a.bar}`} />
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-7 overflow-y-auto p-7 custom-scrollbar">
                {/* Stats always visible */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat icon={<Eye size={15} className={a.text} />} iconBg={a.iconBg} label="Views" value={formatCompact(views)} />
                  <Stat icon={<FileVideo size={15} className={a.text} />} iconBg={a.iconBg} label="Submissions" value={submissions} />
                  <Stat icon={<Wallet size={15} className={a.text} />} iconBg={a.iconBg} label="Budget" value={formatMoney(budget)} />
                  <Stat icon={<TrendingUp size={15} className="text-emerald-400" />} iconBg="bg-emerald-500/10" label="Paid Out" value={formatMoney(paidOut)} valueClass="text-emerald-400" />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{formatMoney(paidOut)} of {formatMoney(budget)} paid out</span>
                    <span className="font-semibold text-white">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full bg-gradient-to-r ${a.bar}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {activeTab === "Overview" && (
                  <>
                    {safeDescription && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-white">About this campaign</h4>
                        <p className="whitespace-pre-line text-sm leading-6 text-zinc-400">{safeDescription}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                      {deadline && (
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Calendar size={15} className={a.text} />
                          Deadline: <span className="text-white">{deadline}</span>
                        </div>
                      )}
                      {payoutPerSubmission && (
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Wallet size={15} className={a.text} />
                          Payout: <span className="text-white">{payoutPerSubmission}</span>
                        </div>
                      )}
                    </div>
                    {platforms.length > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">Accepted on</span>
                        {platforms.map((platform, i) => {
                          const key = String(platform || "").toLowerCase();
                          const IconComponent = PLATFORM_ICONS[key] || PLATFORM_ICONS.instagram;
                          return <IconComponent key={`${platform}-${i}`} size={16} className="text-zinc-400" />;
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "Requirements" && (
                  <div>
                    {safeRequirements.length > 0 ? (
                      <ul className="space-y-2">
                        {safeRequirements.map((req) => (
                          <li key={req} className="flex items-start gap-2 text-sm text-zinc-400">
                            <Sparkles size={14} className={`mt-0.5 shrink-0 ${a.text}`} />
                            {req}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500">No specific requirements listed for this campaign.</p>
                    )}
                  </div>
                )}

                {activeTab === "Resources" && (
                  <div>
                    {resources.length > 0 ? (
                      <div className="space-y-2">
                        {resources.map((res) => (
                          <a
                            key={res.url}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06]"
                          >
                            <span className="flex items-center gap-2.5">
                              <FileText size={15} className={a.text} />
                              {res.label}
                            </span>
                            <ExternalLink size={13} className="text-zinc-500" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-8 text-center">
                        <Link2 size={20} className="text-zinc-600" />
                        <p className="text-sm text-zinc-500">No resources provided for this campaign yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          {!joined && (
            <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 p-7">
              {joinError ? <p className="text-sm text-rose-300">{joinError}</p> : null}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-white/10 px-6 py-3 text-zinc-300 transition hover:bg-white/5"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleJoinCampaign}
                  disabled={!canJoin}
                  className={`rounded-xl px-6 py-3 font-medium text-white transition ${canJoin ? a.solidBtn : "cursor-not-allowed bg-zinc-700 text-zinc-400"}`}
                >
                  {canJoin ? "Join Campaign" : isOwnCampaign ? "Your Campaign" : "View Only"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SubmitClipDialog
        isOpen={showSubmit}
        onClose={() => setShowSubmit(false)}
        campaignId={id}
        onSubmit={handleSubmitClip}
      />
      <ProcessingModal
  isOpen={joining}
  mode="controlled"
  title="Joining campaign"
  steps={["Joining campaign"]}
  currentStepIndex={joinStepIndex}
  onComplete={() => {
    setJoining(false);
    setJoinStepIndex(-1);
    setJoined(true);
  }}
/>
    </>
  );
}

function Stat({ icon, iconBg, label, value, valueClass = "text-white" }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p className={`truncate text-base font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}