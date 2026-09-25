import {
  Shirt,
  Trophy,
  Mic2,
  Smartphone,
  Palette,
  Film,
  Sparkles,
} from "lucide-react";

export const ACCENTS = {
  violet: {
    text: "text-violet-400",
    iconBg: "bg-violet-500/10",
    cover: "from-violet-500/25 via-violet-500/5 to-transparent",
    border: "hover:border-violet-500/50",
    glow: "hover:shadow-violet-500/20",
    bar: "from-violet-500 to-fuchsia-400",
    solidBtn: "bg-violet-600 hover:bg-violet-500",
    chip: "bg-violet-500/10 text-violet-300",
    ring: "ring-violet-500/40",
  },
  emerald: {
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    cover: "from-emerald-500/25 via-emerald-500/5 to-transparent",
    border: "hover:border-emerald-500/50",
    glow: "hover:shadow-emerald-500/20",
    bar: "from-emerald-500 to-teal-400",
    solidBtn: "bg-emerald-600 hover:bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-300",
    ring: "ring-emerald-500/40",
  },
  amber: {
    text: "text-amber-400",
    iconBg: "bg-amber-500/10",
    cover: "from-amber-500/25 via-amber-500/5 to-transparent",
    border: "hover:border-amber-500/50",
    glow: "hover:shadow-amber-500/20",
    bar: "from-amber-500 to-orange-400",
    solidBtn: "bg-amber-500 hover:bg-amber-400",
    chip: "bg-amber-500/10 text-amber-300",
    ring: "ring-amber-500/40",
  },
};

export const formatCompact = (n) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export const formatMoney = (n) => `₹${formatCompact(n)}`;

const CATEGORY_ICONS = {
  fashion: Shirt,
  gaming: Trophy,
  music: Mic2,
  tech: Smartphone,
  art: Palette,
  entertainment: Film,
  default: Sparkles,
};

export function plainText(value) {
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

export function normalizeCampaign(campaign = {}) {
  const category = String(campaign.category || "general").toLowerCase();
  const status = String(campaign.status || "active");

  const rawRequirements = Array.isArray(campaign.requirements)
    ? campaign.requirements
    : typeof campaign.clipperRequirements === "string"
      ? campaign.clipperRequirements
      : typeof campaign.requirements === "string"
        ? campaign.requirements
        : [];

  const normalizedRequirements = (Array.isArray(rawRequirements) ? rawRequirements : [rawRequirements])
    .map((item) => plainText(item))
    .flatMap((item) => item.split(/\n|•/))
    .map((item) => item.trim())
    .filter(Boolean);

  const rewardPer1k = campaign.rewardPer1k ?? campaign.reward_per_1k;
  const endDate = campaign.deadline || campaign.endDate || campaign.end_date || "";

  return {
    ...campaign,
    id: campaign.accessKey || campaign.id,
    title: campaign.name || campaign.title || "Campaign",
    brand: campaign.brandName || campaign.brand || "Brand",
    category: campaign.category ? String(campaign.category).replace(/_/g, " ") : "General",
    icon: campaign.icon || CATEGORY_ICONS[category] || CATEGORY_ICONS.default,
    accent: campaign.accent || "violet",
    status: status.charAt(0).toUpperCase() + status.slice(1),
    thumbnail: campaign.thumbnailUrl || campaign.thumbnail || campaign.image || "",
    views: Number(campaign.views || 0),
    submissions: Number(campaign.submissions || 0),
    budget: Number(campaign.budget || 0),
    paidOut: Number(campaign.paidOut || campaign.paid_out || 0),
    description: plainText(campaign.description || ""),
    requirements: normalizedRequirements,
    deadline: endDate ? String(endDate).split("T")[0] : "",
    payoutPerSubmission: campaign.payoutPerSubmission || (
      rewardPer1k ? `₹${Number(rewardPer1k).toLocaleString("en-IN")} / 1k views` : ""
    ),
    platforms: Array.isArray(campaign.platforms) ? campaign.platforms : [],
    resources: Array.isArray(campaign.resources)
      ? campaign.resources.map((resource) => ({
          label: resource.name || resource.label || "Resource",
          url: resource.url || resource.link || "#",
        }))
      : [],
  };
}
