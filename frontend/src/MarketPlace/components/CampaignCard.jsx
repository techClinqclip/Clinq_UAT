import { useState } from "react";
import {
  Eye,
  Wallet,
  TrendingUp,
  FileVideo,
  Play,
  Maximize2,
  Shirt,
  Trophy,
  Mic2,
  Smartphone,
  Palette,
  Film,
  Sparkles,
} from "lucide-react";
import { ACCENTS, formatCompact, formatMoney } from "./campaignUtils";
import CampaignDetailModal from "./CampaignDetailModal";

const CATEGORY_ICONS = {
  fashion: Shirt,
  gaming: Trophy,
  music: Mic2,
  tech: Smartphone,
  art: Palette,
  entertainment: Film,
  default: Sparkles,
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

function normalizeCampaign(campaign = {}) {
  const category = String(campaign.category || "general").toLowerCase();
  const status = String(campaign.status || "active");

  const rawRequirements = Array.isArray(campaign.requirements)
    ? campaign.requirements
    : typeof campaign.clipperRequirements === "string"
      ? campaign.clipperRequirements
      : [];

  const normalizedRequirements = (Array.isArray(rawRequirements) ? rawRequirements : [rawRequirements])
    .map((item) => plainText(item))
    .flatMap((item) => item.split(/\n|•/))
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    ...campaign,
    title: campaign.name || campaign.title || "Campaign",
    brand: campaign.brandName || campaign.brand || "Brand",
    category: campaign.category ? String(campaign.category).replace(/_/g, " ") : "General",
    icon: CATEGORY_ICONS[category] || CATEGORY_ICONS.default,
    accent: campaign.accent || "violet",
    status: status.charAt(0).toUpperCase() + status.slice(1),
    thumbnail: campaign.thumbnailUrl || campaign.thumbnail || campaign.image || "",
    views: Number(campaign.views || 0),
    submissions: Number(campaign.submissions || 0),
    budget: Number(campaign.budget || 0),
    paidOut: Number(campaign.paidOut || 0),
    description: plainText(campaign.description || ""),
    requirements: normalizedRequirements,
    deadline: campaign.deadline || campaign.endDate || "",
    payoutPerSubmission: campaign.payoutPerSubmission || (
      campaign.rewardPer1k ? `₹${Number(campaign.rewardPer1k).toLocaleString()} / 1k` : ""
    ),
    platforms: Array.isArray(campaign.platforms) ? campaign.platforms : [],
    resources: Array.isArray(campaign.resources) ? campaign.resources.map((resource) => ({
      label: resource.name || resource.label || "Resource",
      url: resource.url || resource.link || "#",
    })) : [],
  };
}

export default function CampaignCard({ campaign }) {
  const [modalOpen, setModalOpen] = useState(false);
  const normalized = normalizeCampaign(campaign);
  const {
    title,
    brand,
    category,
    icon: Icon,
    accent,
    status,
    thumbnail,
    views,
    submissions,
    budget,
    paidOut,
  } = normalized;

  const a = ACCENTS[accent] || ACCENTS.violet;
  const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;
  const isActive = status === "Active";

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl shadow-transparent transition-all duration-300 ease-out hover:z-10 hover:-translate-y-6 hover:scale-[1.07] hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] active:scale-[0.98] ${a.border} ${a.glow}`}
      >
        <div className="relative h-36 overflow-hidden sm:h-40">
          {thumbnail ? (
            <>
              <img
                src={thumbnail}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
              <div className={`absolute inset-0 bg-gradient-to-t ${a.cover} opacity-0 transition-opacity duration-300 group-hover:opacity-60`} />
              <div className="absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
                  <Play size={16} className="ml-0.5 fill-white text-white" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${a.cover}`} />
              <Icon size={110} strokeWidth={1} className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
            </>
          )}

          <div className="relative z-10 flex h-full flex-col justify-between p-4">
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${a.chip}`}>
                <Icon size={12} />
                {category}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isActive ? "bg-green-500/15 text-green-400" : "bg-zinc-500/15 text-zinc-400"}`}>
                {status}
              </span>
            </div>
            <div>
              <p className="text-xs text-zinc-300">{brand}</p>
              <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">{title}</h3>
            </div>
          </div>

          <div className="absolute bottom-3 right-3 z-20 flex h-8 w-8 scale-75 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Maximize2 size={13} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          <StatBox icon={<Eye size={15} className={a.text} />} iconBg={a.iconBg} label="Views" value={formatCompact(views)} />
          <StatBox icon={<FileVideo size={15} className={a.text} />} iconBg={a.iconBg} label="Submissions" value={submissions} />
          <StatBox icon={<Wallet size={15} className={a.text} />} iconBg={a.iconBg} label="Budget" value={formatMoney(budget)} />
          <StatBox icon={<TrendingUp size={15} className="text-emerald-400" />} iconBg="bg-emerald-500/10" label="Paid Out" value={formatMoney(paidOut)} valueClass="text-emerald-400" />
        </div>

        <div className="px-5 pb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-500">{formatMoney(paidOut)} of {formatMoney(budget)} paid out</span>
            <span className="font-semibold text-white">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div className={`h-full rounded-full bg-gradient-to-r ${a.bar} transition-all duration-500`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Mobile/touch: button stays in normal flow since there's no hover */}
        <div className="border-t border-white/5 p-5 pt-5 lg:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
            className={`block w-full rounded-xl px-4 py-3 text-center text-sm font-medium text-white transition ${a.solidBtn}`}
          >
            View Details
          </button>
        </div>

        {/* Desktop: overlay slides up on hover without growing the card's box height */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto lg:block">
          <div className="border-t border-white/10 bg-[#11111A]/95 p-5 backdrop-blur-sm">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModalOpen(true);
              }}
              className={`block w-full rounded-xl px-4 py-3 text-center text-sm font-medium text-white transition ${a.solidBtn}`}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
      

      <CampaignDetailModal isOpen={modalOpen} onClose={() => setModalOpen(false)} campaign={normalized} />
    </>
  );
}

function StatBox({ icon, iconBg, label, value, valueClass = "text-white" }) {
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