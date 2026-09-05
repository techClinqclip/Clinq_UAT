import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserRound,
  Sparkles,
  Wrench,
  BookOpen,
  Wallet,
  Check,
  BadgeCheck,
  MapPin,
  Globe,
  Camera,
  Scissors,
  ListChecks,
  Briefcase,
  IndianRupee,
  Pencil,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { FaYoutube, FaInstagram, FaTiktok, FaXTwitter } from "react-icons/fa6";
import {
  Field,
  Input,
  TextArea,
  ChipGroup,
  accentStyles,
} from "../../onboarding/Layout";
import Breadcrumbs from "../../components/Breadcrumbs";
import ProfileLoadingSkeleton from "../../shared/ui/ProfileLoadingSkeleton";
import { api } from "../../lib/api";
import useToast from "../../hooks/useToast";

/*
  Backend wiring: SECTION_ENDPOINTS + buildPayload() are the only two
  things a backend integration needs to touch — same convention as the
  Creator profile. UI-only helper fields (the "<field>OtherActive" /
  "<field>OtherDraft" pairs) exist purely to drive the "Other" inputs on
  multi-select groups and are intentionally left out of every payload.

  Confirmation flow: every action that could discard or persist unsaved
  work (switching tabs, cancelling, saving) routes through requestConfirm()
  so the user always gets an explicit yes/no before anything changes.

  Contact number: country code + digits, same COUNTRY_CODES/NiceSelect
  pattern as the Brand/Creator profiles — see splitContactNumber() below
  for how a stored "+91 90000 11111"-style string is parsed back into the
  two-field UI.
*/

const MOCK_USER = {
  photo: null,
  cover: null,
  firstName: "Rohan",
  lastName: "Verma",
  username: "rohanclips",
  email: "rohan@example.com",
  role: "Clipper",
  verified: true,
  dob: "2001-11-08",
  gender: "Male",

  experienceLevel: "1-3 years",
  experienceDescription:
    "3 years editing gaming and podcast content, specializing in fast-paced highlight reels and reaction clips.",
  handles: { instagram: "@rohanclips", youtube: "", tiktok: "@rohan.edits", twitter: "@rohanclips" },
  portfolioUrl: "https://rohanclips.com",

  editingTools: ["Premiere Pro", "CapCut"],
  skills: ["Video editing", "Color grading"],
  categories: ["Gaming", "Comedy"],

  editingToolsOtherActive: false,
  editingToolsOtherDraft: "",
  skillsOtherActive: false,
  skillsOtherDraft: "",
  categoriesOtherActive: false,
  categoriesOtherDraft: "",

  bio: "Clipper turning long-form streams into scroll-stopping shorts. Fast turnaround, clean cuts, punchy captions.",
  languages: ["English", "Hindi"],
  city: "Jaipur",
  state: "Rajasthan",
  country: "India",

  contactNumber: "+91 90000 11111",
  paymentMethod: "upi",
  upiId: "rohan@upi",

  // Only relevant when paymentMethod is "bank"
  bankAccountHolder: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankName: "",

  emailNotifications: true,

  stats: {
    gigsCompleted: 23,
    campaignsWorked: 9,
    clipsSubmitted: 187,
    totalEarned: "₹41,600",
  },
};

const ACCENT = "amber";

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

const LANGUAGES = [
  "English", "Hindi", "Spanish", "French", "German",
  "Mandarin", "Arabic", "Portuguese", "Bengali", "Japanese",
];

const EXPERIENCE_LEVELS = ["New to clipping", "0-1 years", "1-3 years", "3+ years"];

const EDITING_TOOLS = [
  "Premiere Pro", "After Effects", "DaVinci Resolve", "CapCut", "Final Cut Pro", "Photoshop", "Canva",
];

const SKILLS = [
  "Video editing", "Motion graphics", "Graphic designing", "Color grading",
  "Sound design", "Thumbnail design", "Scriptwriting",
];

const CATEGORIES = [
  "Gaming", "Comedy", "Sports", "Music", "Tech", "Finance",
  "Lifestyle", "Education", "News & Politics", "Fashion",
];

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: FaInstagram, color: "text-pink-400", placeholder: "@handle" },
  { key: "youtube", label: "YouTube", icon: FaYoutube, color: "text-red-400", placeholder: "channel URL or @handle" },
  { key: "tiktok", label: "TikTok", icon: FaTiktok, color: "text-zinc-200", placeholder: "@handle" },
  { key: "twitter", label: "X / Twitter", icon: FaXTwitter, color: "text-zinc-300", placeholder: "@handle" },
];

const TABS = [
  { id: "identity", label: "Identity", icon: UserRound },
  { id: "experience", label: "Experience", icon: Sparkles },
  { id: "skills", label: "Tools & Skills", icon: Wrench },
  { id: "about", label: "About", icon: BookOpen },
  { id: "payments", label: "Contact & Payments", icon: Wallet },
];

const STAT_ACCENTS = {
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
  cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
  violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
};

const USERNAME_MIN_LENGTH = 6;

// Country codes for the contact number — expand this list as needed.
// `digits` drives the length validation for that country.
const COUNTRY_CODES = [
  { code: "+91", country: "India", digits: 10 },
  { code: "+1", country: "US/Canada", digits: 10 },
  { code: "+44", country: "UK", digits: 10 },
  { code: "+61", country: "Australia", digits: 9 },
  { code: "+971", country: "UAE", digits: 9 },
  { code: "+65", country: "Singapore", digits: 8 },
  { code: "+49", country: "Germany", digits: 10 },
  { code: "+33", country: "France", digits: 9 },
  { code: "+81", country: "Japan", digits: 10 },
  { code: "+86", country: "China", digits: 11 },
];
const DEFAULT_COUNTRY_CODE = "+91";

// Splits a stored contact string like "+919876543210" or "+91 9876543210"
// back into { code, number } for the two-field UI. Falls back to the
// default country code if nothing matches.
function splitContactNumber(raw) {
  if (!raw) return { contactCode: DEFAULT_COUNTRY_CODE, contactNumber: "" };
  const match = String(raw)
    .trim()
    .match(/^(\+\d{1,4})[\s-]?(\d[\d\s-]*)$/);
  if (match) return { contactCode: match[1], contactNumber: match[2].replace(/\D/g, "") };
  return { contactCode: DEFAULT_COUNTRY_CODE, contactNumber: String(raw).replace(/\D/g, "") };
}
const isValidUrl = (value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const hasAnyHandle = (handles) => Object.values(handles).some((v) => v && v.trim());

const DEFAULT_HANDLES = { instagram: "", youtube: "", tiktok: "", twitter: "" };

function buildInitialForm(profile = {}) {
  const onboarding = profile?.onboarding_data || {};

  return {
    photo: profile?.avatar || null,
    cover: profile?.cover || null,
    firstName: profile?.first_name || profile?.manager_first_name || "",
    lastName: profile?.last_name || profile?.manager_last_name || "",
    username: profile?.username || "",
    email: profile?.email || "",
    role: profile?.user_type || "Clipper",
    verified: false,
    dob: profile?.date_of_birth || onboarding?.dob || "",
    gender: profile?.gender || onboarding?.gender || "",
    experienceLevel: profile?.experience_level || onboarding?.experienceLevel || "",
    experienceDescription: profile?.experience_description || "",
    handles: profile?.handles || onboarding?.handles || DEFAULT_HANDLES,
    portfolioUrl: profile?.portfolio_url || onboarding?.portfolioUrl || "",
    editingTools: Array.isArray(profile?.editing_tools) ? profile.editing_tools : onboarding?.editingTools || [],
    skills: Array.isArray(profile?.skills) ? profile.skills : onboarding?.skills || [],
    categories: Array.isArray(onboarding?.categories) ? onboarding.categories : [],
    editingToolsOtherActive: false,
    editingToolsOtherDraft: "",
    skillsOtherActive: false,
    skillsOtherDraft: "",
    categoriesOtherActive: false,
    categoriesOtherDraft: "",
    bio: profile?.bio || onboarding?.bio || "",
    languages: Array.isArray(profile?.languages) ? profile.languages : onboarding?.languages || [],
    city: profile?.city || onboarding?.city || "",
    state: profile?.state || onboarding?.state || "",
    country: profile?.country || onboarding?.country || "",
    ...splitContactNumber(profile?.contact_number || onboarding?.contactNumber || ""),
    paymentMethod: profile?.payment_method || onboarding?.paymentMethod || "upi",
    upiId: profile?.upi_id || onboarding?.upiId || "",
    bankAccountHolder: profile?.bank_account_holder || "",
    bankAccountNumber: profile?.bank_account_number || "",
    bankIfsc: profile?.bank_ifsc || "",
    bankName: profile?.bank_name || "",
    emailNotifications: profile?.email_notifications ?? onboarding?.emailNotifications ?? true,
    stats: {
      gigsCompleted: profile?.clips_completed || 0,
      campaignsWorked: 0,
      clipsSubmitted: profile?.views_generated || 0,
      totalEarned: profile?.total_earnings ? `₹${Number(profile.total_earnings).toLocaleString()}` : "₹0",
    },
  };
}

const VALIDATORS = {
  identity: (f) => {
    if (!f.firstName.trim()) return "First name is required.";
    if (!f.lastName.trim()) return "Last name is required.";
    if (!f.username.trim()) return "Username is required.";
    if (f.username.trim().length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
    return null;
  },
  experience: (f) => {
    if (!f.experienceLevel) return "Please select your experience level.";
    if (!hasAnyHandle(f.handles)) return "Add at least one social media handle.";
    if (f.portfolioUrl && !isValidUrl(f.portfolioUrl)) return "Please enter a valid portfolio URL.";
    return null;
  },
  skills: (f) => {
    if (f.editingTools.length === 0) return "Select at least one editing tool.";
    if (f.skills.length === 0) return "Select at least one skill.";
    if (f.categories.length === 0) return "Select at least one interest / category.";
    return null;
  },
  about: (f) => {
    if (f.languages.length === 0) return "Select at least one language.";
    if (!f.city.trim()) return "City is required.";
    if (!f.country.trim()) return "Country is required.";
    return null;
  },
  payments: (f) => {
    if (!f.contactNumber.trim()) return "Contact number is required.";
    if (!/^\d+$/.test(f.contactNumber.trim())) return "Contact number must contain digits only.";
    const expectedDigits = COUNTRY_CODES.find((c) => c.code === f.contactCode)?.digits;
    if (expectedDigits && f.contactNumber.trim().length !== expectedDigits) {
      return `Enter a valid ${f.contactCode} number (${expectedDigits} digits).`;
    }
    if (!f.paymentMethod) return "Please select a payment method.";

    if (f.paymentMethod === "upi" && !f.upiId.trim()) return "UPI ID is required.";

    if (f.paymentMethod === "bank") {
      if (!f.bankAccountHolder.trim()) return "Account holder name is required.";
      if (!f.bankAccountNumber.trim()) return "Account number is required.";
      if (!f.bankIfsc.trim()) return "IFSC code is required.";
      if (!f.bankName.trim()) return "Bank name is required.";
    }

    return null;
  },
};

const buildPayload = (tabId, f) => {
  const basePayload = {
    onboarding_data: {
      categories: f.categories,
    },
  };

  switch (tabId) {
    case "identity":
      return {
        ...basePayload,
        first_name: f.firstName,
        last_name: f.lastName,
        username: f.username,
        dob: f.dob,
        gender: f.gender,
      };
    case "experience":
      return {
        ...basePayload,
        experience_level: f.experienceLevel,
        experience_description: f.experienceDescription,
        handles: f.handles,
        portfolioUrl: f.portfolioUrl,
      };
    case "skills":
      return {
        ...basePayload,
        editingTools: f.editingTools,
        skills: f.skills,
      };
    case "about":
      return {
        ...basePayload,
        bio: f.bio,
        languages: f.languages,
        city: f.city,
        state: f.state,
        country: f.country,
      };
      case "payments":
        return {
          ...basePayload,
          contactNumber: `${f.contactCode} ${f.contactNumber}`,
          paymentMethod: f.paymentMethod,
          upiId: f.upiId,
          bankAccountHolder: f.bankAccountHolder,
          bankAccountNumber: f.bankAccountNumber,
          bankIfsc: f.bankIfsc,
          bankName: f.bankName,
          emailNotifications: f.emailNotifications,
        };
    default:
      return basePayload;
  }
};

function SaveButton({ status, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={status === "saving"}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#0A0A0F] transition ${
        status === "saved" ? "bg-emerald-400" : accentStyles[ACCENT].solidBtn
      } ${status === "saving" ? "opacity-60" : ""}`}
    >
      {status === "saved" && <Check size={15} />}
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save changes"}
    </button>
  );
}

function EditControl({ isEditing, onEdit }) {
  if (isEditing) return null;
  return (
    <div className="flex justify-end">
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
      >
        <Pencil size={13} />
        Edit
      </button>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/20"
    >
      <div>
        <span className="text-sm text-zinc-300">{label}</span>
        {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      </div>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? accentStyles[ACCENT].solidBtn.split(" ")[0] : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Chip({ label, selected, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
        selected
          ? `border-transparent ${accentStyles[ACCENT].solidBtn} text-[#0A0A0F]`
          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

// Custom dropdown replacing a plain native <select> — matches the country
// code selector used on the Brand/Creator profiles: a button that toggles
// an animated floating options panel, click-outside to close.
function NiceSelect({ value, onChange, options, disabled, placeholder = "Select", menuClassName = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = normalized.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border bg-white/[0.03] px-3.5 py-2.5 text-left text-sm outline-none transition focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-white/20" : "border-white/10"
        }`}
      >
        <span className={`truncate ${selected ? "text-white" : "text-zinc-500"}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#15151F] p-1.5 shadow-2xl ${
              menuClassName || "w-full"
            }`}
          >
            {normalized.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? `${accentStyles[ACCENT].iconBg} ${accentStyles[ACCENT].iconText}`
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Reusable "pick many, or add your own" group — mirrors the niche/interests
   pattern from the Creator profile, generalized for editingTools, skills,
   and categories so each doesn't need bespoke state. */
function MultiChipField({ presets, selected, customValues, otherActive, otherDraft, onToggle, onToggleOther, onDraftChange, onAddCustom, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((p) => (
        <Chip key={p} label={p} selected={selected.includes(p)} onClick={() => onToggle(p)} disabled={disabled} />
      ))}
      {customValues.map((custom) => (
        <Chip key={custom} label={`${custom} ✕`} selected onClick={() => onToggle(custom)} disabled={disabled} />
      ))}
      <Chip label="Other" selected={otherActive} onClick={onToggleOther} disabled={disabled} />
      {otherActive && (
        <div className="mt-1 flex w-full gap-2">
          <Input
            accent={ACCENT}
            placeholder="Type your own and press Enter"
            value={otherDraft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddCustom();
              }
            }}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={onAddCustom}
            disabled={disabled}
            className={`shrink-0 rounded-lg px-4 text-sm font-semibold text-[#0A0A0F] transition ${accentStyles[ACCENT].solidBtn}`}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

/* Blocking confirmation modal — used for any action that would discard or
   persist unsaved changes (tab switch, cancel, save). */
function ConfirmDialog({ state, onCancel }) {
  if (!state) return null;
  const { title, message, confirmLabel, cancelLabel, tone = "default", onConfirm } = state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121A] p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              tone === "danger" ? "bg-red-500/10 text-red-400" : `${accentStyles[ACCENT].iconBg} ${accentStyles[ACCENT].iconText}`
            }`}
          >
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/20"
          >
            {cancelLabel ?? "Keep editing"}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tone === "danger"
                ? "bg-red-500 text-white hover:bg-red-400"
                : `text-[#0A0A0F] ${accentStyles[ACCENT].solidBtn}`
            }`}
          >
            {confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClipperProfile() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState(
    TABS.some((t) => t.id === requestedTab) ? requestedTab : "identity"
  );
  const [form, setForm] = useState(() => buildInitialForm());
  const [profileData, setProfileData] = useState(null);
  const [editingTabs, setEditingTabs] = useState({});
  const [snapshots, setSnapshots] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      try {
        // Fetch profile + related lists so the stat cards reflect real counts
        const [data, gigs, submissions] = await Promise.all([
          api("/api/auth/profile/me/"),
          api("/api/content/campaigns/clipper-gigs/?summary=true&count_only=true"),
          api("/api/content/clipper-submissions/?summary=true"),
        ]);

        if (!mounted) return;

        // Base form from profile payload
        setProfileData(data);
        setForm((prev) => {
          const base = buildInitialForm(data);

          const campaignsWorked = Number(gigs?.count ?? (Array.isArray(gigs) ? gigs.length : 0));
          const clipsSubmitted = Number(submissions?.count ?? data?.clips_submitted ?? 0);

          const totalEarned = data?.total_earnings
            ? `₹${Number(data.total_earnings).toLocaleString()}`
            : submissions?.total_earned != null
            ? `₹${Number(submissions.total_earned).toLocaleString()}`
            : "₹0";

          return {
            ...base,
            stats: {
              gigsCompleted: data?.clips_completed || base.stats.gigsCompleted || 0,
              campaignsWorked,
              clipsSubmitted,
              totalEarned,
            },
          };
        });

        setLoadError(null);
      } catch (err) {
        if (!mounted) return;
        setLoadError(err?.message || "Unable to load profile.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleLanguage = (lang) =>
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
    }));

  // Generic multi-select toggle used by editingTools / skills / categories.
  const toggleMulti = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const toggleMultiOther = (key) => setForm((f) => ({ ...f, [`${key}OtherActive`]: !f[`${key}OtherActive`] }));

  const setMultiDraft = (key) => (value) => setForm((f) => ({ ...f, [`${key}OtherDraft`]: value }));

  const addMultiCustom = (key) => () => {
    const value = form[`${key}OtherDraft`].trim();
    if (!value) return;
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key] : [...f[key], value],
      [`${key}OtherDraft`]: "",
    }));
  };

  const updateHandle = (platform) => (e) =>
    setForm((f) => ({ ...f, handles: { ...f.handles, [platform]: e.target.value } }));

  const handleImageFile = (key) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const value = reader.result;
      const backendField = key === "photo" ? "avatar" : "cover";
      setForm((f) => ({ ...f, [key]: value }));

      try {
        await api("/api/auth/profile/me/", {
          method: "PATCH",
          body: { [backendField]: value },
        });
        showToast({ type: "success", message: `${key === "photo" ? "Profile photo" : "Cover photo"} updated.` });
      } catch (err) {
        showToast({
          type: "error",
          message: err?.message || "Failed to upload image. Please try again.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (tabId) => {
    setSnapshots((s) => ({ ...s, [tabId]: JSON.parse(JSON.stringify(form)) }));
    setEditingTabs((e) => ({ ...e, [tabId]: true }));
  };

  const cancelEdit = (tabId) => {
    if (snapshots[tabId]) setForm(snapshots[tabId]);
    setEditingTabs((e) => ({ ...e, [tabId]: false }));
  };

  // Has the form actually changed since we started editing this tab?
  const isDirty = (tabId) => {
    if (!editingTabs[tabId] || !snapshots[tabId]) return false;
    return JSON.stringify(form) !== JSON.stringify(snapshots[tabId]);
  };

  const closeConfirm = () => setConfirmState(null);

  const requestConfirm = ({ title, message, confirmLabel, cancelLabel, tone, onConfirm }) => {
    setConfirmState({
      title,
      message,
      confirmLabel,
      cancelLabel,
      tone,
      onConfirm: () => {
        onConfirm();
        closeConfirm();
      },
    });
  };

  // Switching tabs while the current tab has unsaved edits needs confirmation.
  const handleTabSwitch = (id) => {
    if (id === tab) return;
    if (isDirty(tab)) {
      requestConfirm({
        title: "Unsaved changes",
        message: "You have unsaved changes in this section. Switching tabs will discard them.",
        confirmLabel: "Discard & switch",
        tone: "danger",
        onConfirm: () => {
          cancelEdit(tab);
          setTab(id);
        },
      });
    } else {
      setTab(id);
    }
  };

  // Cancelling only needs confirmation if something was actually changed.
  const handleCancelClick = (tabId) => {
    if (isDirty(tabId)) {
      requestConfirm({
        title: "Discard changes?",
        message: "Any unsaved changes in this section will be lost.",
        confirmLabel: "Discard changes",
        tone: "danger",
        onConfirm: () => cancelEdit(tabId),
      });
    } else {
      cancelEdit(tabId);
    }
  };

  const performSave = async (tabId) => {
    const validate = VALIDATORS[tabId] ?? (() => null);
    const errorMsg = validate(form);
    if (errorMsg) {
      showToast({ type: "error", message: errorMsg });
      return;
    }

    setSaveStatus((s) => ({ ...s, [tabId]: "saving" }));

    try {
      const payload = buildPayload(tabId, form);
      const data = await api("/api/auth/profile/me/", {
        method: "PATCH",
        body: payload,
      });

      setProfileData(data);
      setForm(buildInitialForm(data));
      setSaveStatus((s) => ({ ...s, [tabId]: "saved" }));
      setEditingTabs((e) => ({ ...e, [tabId]: false }));
      showToast({ type: "success", message: "Changes saved." });
      setTimeout(() => setSaveStatus((s) => ({ ...s, [tabId]: "idle" })), 1800);
    } catch (err) {
      setSaveStatus((s) => ({ ...s, [tabId]: "idle" }));
      showToast({
        type: "error",
        message: err?.message || "Something went wrong saving your changes. Please try again.",
      });
    }
  };

  // Save always asks for confirmation before actually persisting.
  const handleSaveClick = (tabId) => {
    const validate = VALIDATORS[tabId] ?? (() => null);
    const errorMsg = validate(form);
    if (errorMsg) {
      showToast({ type: "error", message: errorMsg });
      return;
    }
    requestConfirm({
      title: "Save changes?",
      message: "This will update your profile with the changes you made in this section.",
      confirmLabel: "Save",
      onConfirm: () => performSave(tabId),
    });
  };

  const statCards = [
    { label: "Gigs Completed", value: form.stats.gigsCompleted, icon: Briefcase, accent: "amber" },
    { label: "Campaigns Worked", value: form.stats.campaignsWorked, icon: ListChecks, accent: "cyan" },
    { label: "Clips Submitted", value: form.stats.clipsSubmitted, icon: Scissors, accent: "violet" },
    { label: "Total Earned", value: form.stats.totalEarned, icon: IndianRupee, accent: "emerald" },
  ];

  const customEditingTools = form.editingTools.filter((v) => !EDITING_TOOLS.includes(v));
  const customSkills = form.skills.filter((v) => !SKILLS.includes(v));
  const customCategories = form.categories.filter((v) => !CATEGORIES.includes(v));

  if (loading) {
    return <ProfileLoadingSkeleton tabCount={TABS.length} />;
  }

  return (
    <div>
      <Breadcrumbs />

      <ConfirmDialog state={confirmState} onCancel={closeConfirm} />

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="group relative h-36 sm:h-44">
          {form.cover ? (
            <img src={form.cover} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-amber-500/25 via-amber-500/5 to-transparent" />
          )}
          <label
            htmlFor="cover-upload"
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100"
          >
            <span className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <Camera size={14} />
              Change cover
            </span>
          </label>
          <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleImageFile("cover")} />
        </div>

        <div className="px-6 pb-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
    <div className="-mt-10 group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#0A0A0F] bg-[#11111A]">
      {form.photo ? (
        <img src={form.photo} alt="Photo" className="h-full w-full object-cover" />
      ) : (
        <UserRound size={28} className="text-zinc-600" />
      )}
      <label
        htmlFor="photo-upload"
        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100"
      >
        <Camera size={16} className="text-white" />
      </label>
      <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageFile("photo")} />
    </div>

    <div className="pb-1">
      <div className="flex items-center gap-1.5">
        <h1 className="text-2xl font-bold text-white">
          {form.firstName} {form.lastName}
        </h1>
        {form.verified && (
          <BadgeCheck size={19} className={accentStyles[ACCENT].iconText} title="Verified clipper" />
        )}
      </div>
      <p className="text-sm text-zinc-400">@{form.username}</p>
    </div>
  </div>
</div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, accent }) => {
          const a = STAT_ACCENTS[accent];
          return (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                <Icon size={16} className={a.iconText} />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{value}</p>
              <p className="mt-1 text-xs text-zinc-500">{label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Tab nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabSwitch(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition md:w-full ${
                tab === id
                  ? `${accentStyles[ACCENT].iconBg} ${accentStyles[ACCENT].iconText}`
                  : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span className="whitespace-nowrap">{label}</span>
              {isDirty(id) && (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Unsaved changes" />
              )}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          {tab === "identity" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.identity} onEdit={() => startEdit("identity")} />

              <div className={`space-y-6 ${!editingTabs.identity ? "pointer-events-none opacity-60" : ""}`}>
                <p className="text-xs text-zinc-500">Update your photo and cover image from the header above.</p>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="First name" required>
                    <Input accent={ACCENT} value={form.firstName} onChange={set("firstName")} disabled={!editingTabs.identity} />
                  </Field>
                  <Field label="Last name" required>
                    <Input accent={ACCENT} value={form.lastName} onChange={set("lastName")} disabled={!editingTabs.identity} />
                  </Field>
                </div>

                <Field label="Username" required hint={`At least ${USERNAME_MIN_LENGTH} characters. Shown on your public profile`}>
                  <Input
                    accent={ACCENT}
                    value={form.username}
                    onChange={set("username")}
                    placeholder="yourhandle"
                    disabled={!editingTabs.identity}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of birth" required>
                    <Input accent={ACCENT} type="date" value={form.dob} onChange={set("dob")} disabled={!editingTabs.identity} />
                  </Field>
                  <Field label="Gender" required>
                    <div className="flex flex-wrap gap-2">
                      {GENDERS.map((g) => (
                        <Chip
                          key={g}
                          label={g}
                          selected={form.gender === g}
                          onClick={() => setForm((f) => ({ ...f, gender: g }))}
                          disabled={!editingTabs.identity}
                        />
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Email" hint="Contact support to change">
                  <Input accent={ACCENT} value={form.email} disabled className="opacity-60" />
                </Field>
              </div>

              {editingTabs.identity && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("identity")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.identity ?? "idle"} onClick={() => handleSaveClick("identity")} />
                </div>
              )}
            </div>
          )}

          {tab === "experience" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.experience} onEdit={() => startEdit("experience")} />

              <div className={`space-y-6 ${!editingTabs.experience ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Experience level" required hint="Where you're at with clipping today">
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <Chip
                        key={level}
                        label={level}
                        selected={form.experienceLevel === level}
                        onClick={() => setForm((f) => ({ ...f, experienceLevel: level }))}
                        disabled={!editingTabs.experience}
                      />
                    ))}
                  </div>
                </Field>

                <Field label="Experience description" hint="Optional — tell brands about your background">
                  <TextArea
                    accent={ACCENT}
                    rows={4}
                    placeholder="e.g. 3 years editing gaming and podcast content, specializing in fast-paced highlight reels..."
                    value={form.experienceDescription}
                    onChange={set("experienceDescription")}
                    disabled={!editingTabs.experience}
                  />
                </Field>

                <Field label="Social media handles" required hint="At least one">
                  <div className="space-y-3">
                    {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, color, placeholder }) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                          <Icon size={16} className={color} />
                        </div>
                        <Input
                          accent={ACCENT}
                          placeholder={`${label} ${placeholder}`}
                          value={form.handles[key]}
                          onChange={updateHandle(key)}
                          disabled={!editingTabs.experience}
                        />
                      </div>
                    ))}
                  </div>
                </Field>

                <Field label="Portfolio link" hint="Optional">
                  <Input
                    accent={ACCENT}
                    type="url"
                    placeholder="https://your-portfolio.com"
                    value={form.portfolioUrl}
                    onChange={set("portfolioUrl")}
                    disabled={!editingTabs.experience}
                  />
                </Field>
              </div>

              {editingTabs.experience && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("experience")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.experience ?? "idle"} onClick={() => handleSaveClick("experience")} />
                </div>
              )}
            </div>
          )}

          {tab === "skills" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.skills} onEdit={() => startEdit("skills")} />

              <div className={`space-y-6 ${!editingTabs.skills ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Editing tools" required hint="Select all that apply — or add your own">
                  <MultiChipField
                    presets={EDITING_TOOLS}
                    selected={form.editingTools}
                    customValues={customEditingTools}
                    otherActive={form.editingToolsOtherActive}
                    otherDraft={form.editingToolsOtherDraft}
                    onToggle={(v) => toggleMulti("editingTools", v)}
                    onToggleOther={() => toggleMultiOther("editingTools")}
                    onDraftChange={setMultiDraft("editingTools")}
                    onAddCustom={addMultiCustom("editingTools")}
                    disabled={!editingTabs.skills}
                  />
                </Field>

                <Field label="Skills" required hint="Select all that apply — or add your own">
                  <MultiChipField
                    presets={SKILLS}
                    selected={form.skills}
                    customValues={customSkills}
                    otherActive={form.skillsOtherActive}
                    otherDraft={form.skillsOtherDraft}
                    onToggle={(v) => toggleMulti("skills", v)}
                    onToggleOther={() => toggleMultiOther("skills")}
                    onDraftChange={setMultiDraft("skills")}
                    onAddCustom={addMultiCustom("skills")}
                    disabled={!editingTabs.skills}
                  />
                </Field>

                <Field label="Interests / Category" required hint="Select all that apply — or add your own">
                  <MultiChipField
                    presets={CATEGORIES}
                    selected={form.categories}
                    customValues={customCategories}
                    otherActive={form.categoriesOtherActive}
                    otherDraft={form.categoriesOtherDraft}
                    onToggle={(v) => toggleMulti("categories", v)}
                    onToggleOther={() => toggleMultiOther("categories")}
                    onDraftChange={setMultiDraft("categories")}
                    onAddCustom={addMultiCustom("categories")}
                    disabled={!editingTabs.skills}
                  />
                </Field>
              </div>

              {editingTabs.skills && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("skills")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.skills ?? "idle"} onClick={() => handleSaveClick("skills")} />
                </div>
              )}
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.about} onEdit={() => startEdit("about")} />

              <div className={`space-y-6 ${!editingTabs.about ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Bio" hint="Optional">
                  <TextArea accent={ACCENT} rows={3} value={form.bio} onChange={set("bio")} disabled={!editingTabs.about} />
                </Field>

                <Field label="Languages" required hint="Select all that apply">
                  <ChipGroup options={LANGUAGES} selected={form.languages} onToggle={toggleLanguage} accent={ACCENT} />
                </Field>

                <Field label="Location" required>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Input accent={ACCENT} placeholder="City" value={form.city} onChange={set("city")} disabled={!editingTabs.about} />
                    <Input accent={ACCENT} placeholder="State" value={form.state} onChange={set("state")} disabled={!editingTabs.about} />
                    <Input
                      accent={ACCENT}
                      placeholder="Country"
                      value={form.country}
                      onChange={set("country")}
                      disabled={!editingTabs.about}
                      className="col-span-2 sm:col-span-1"
                    />
                  </div>
                </Field>
              </div>

              {editingTabs.about && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("about")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.about ?? "idle"} onClick={() => handleSaveClick("about")} />
                </div>
              )}
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">Ready to cash out?</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Withdraw your available earnings to the payment method below.
                  </p>
                </div>
                <Link
                  to="/clipper/withdraw"
                  className={`inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-[#0A0A0F] transition ${accentStyles[ACCENT].solidBtn}`}
                >
                  Withdraw Earnings
                </Link>
              </div>

              <EditControl isEditing={editingTabs.payments} onEdit={() => startEdit("payments")} />

              <div className={`space-y-6 ${!editingTabs.payments ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Contact number" required hint="Select a country code, then digits only">
                  <div className="flex gap-2">
                    <div className="w-44 shrink-0">
                      <NiceSelect
                        value={form.contactCode}
                        onChange={(v) => setForm((f) => ({ ...f, contactCode: v }))}
                        options={COUNTRY_CODES.map((c) => ({ value: c.code, label: `${c.code} ${c.country}` }))}
                        disabled={!editingTabs.payments}
                        menuClassName="w-56 custom-scrollbar"
                      />
                    </div>
                    <Input
                      accent={ACCENT}
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={form.contactNumber}
                      onChange={(e) => {
                        const maxLen = COUNTRY_CODES.find((c) => c.code === form.contactCode)?.digits || 15;
                        const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                        setForm((f) => ({ ...f, contactNumber: digits }));
                      }}
                      disabled={!editingTabs.payments}
                    />
                  </div>
                </Field>

                <Field label="Payment method" required>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "upi", label: "UPI" },
                      { id: "bank", label: "Bank Account" },
                    ].map((method) => (
                      <Chip
                        key={method.id}
                        label={method.label}
                        selected={form.paymentMethod === method.id}
                        onClick={() => setForm((f) => ({ ...f, paymentMethod: method.id }))}
                        disabled={!editingTabs.payments}
                      />
                    ))}
                  </div>
                </Field>

                {form.paymentMethod === "upi" && (
                  <Field label="UPI ID" required>
                    <Input accent={ACCENT} value={form.upiId} onChange={set("upiId")} disabled={!editingTabs.payments} />
                  </Field>
                )}

                {form.paymentMethod === "bank" && (
                  <div className="space-y-4">
                    <Field label="Account holder name" required>
                      <Input
                        accent={ACCENT}
                        value={form.bankAccountHolder}
                        onChange={set("bankAccountHolder")}
                        disabled={!editingTabs.payments}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Account number" required>
                        <Input
                          accent={ACCENT}
                          value={form.bankAccountNumber}
                          onChange={set("bankAccountNumber")}
                          disabled={!editingTabs.payments}
                        />
                      </Field>
                      <Field label="IFSC code" required>
                        <Input
                          accent={ACCENT}
                          placeholder="e.g. SBIN0001234"
                          value={form.bankIfsc}
                          onChange={(e) => setForm((f) => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))}
                          disabled={!editingTabs.payments}
                        />
                      </Field>
                    </div>

                    <Field label="Bank name" required>
                      <Input
                        accent={ACCENT}
                        value={form.bankName}
                        onChange={set("bankName")}
                        disabled={!editingTabs.payments}
                      />
                    </Field>
                  </div>
                )}

                <ToggleRow
                  label="Email notifications"
                  hint="New campaign matches and community activity"
                  checked={form.emailNotifications}
                  onChange={() => setForm((f) => ({ ...f, emailNotifications: !f.emailNotifications }))}
                  disabled={!editingTabs.payments}
                />
              </div>

              {editingTabs.payments && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("payments")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.payments ?? "idle"} onClick={() => handleSaveClick("payments")} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}