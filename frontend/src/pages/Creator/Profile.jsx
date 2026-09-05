import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProfileLoadingSkeleton from "../../shared/ui/ProfileLoadingSkeleton";
import {
  UserRound,
  Flame,
  BookOpen,
  Wallet,
  Check,
  BadgeCheck,
  MapPin,
  Globe,
  Camera,
  Megaphone,
  Users,
  Briefcase,
  IndianRupee,
  Pencil,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { FaYoutube, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import {
  Field,
  Input,
  TextArea,
  ChipGroup,
  accentStyles,
} from "../../onboarding/Layout";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import { api, API_BASE_URL } from "../../lib/api";
import { getStoredUser, hydrateAuthState } from "../../lib/auth";

const resolveImageUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;
  // Relative path from backend (e.g. /media/avatars/...)
  const base = (API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
};

/*
  Backend wiring: the form is pre-filled from the authenticated user's
  profile at /api/auth/profile/me/.  Every tab saves to the same endpoint
  (PATCH) with a shape that the backend ProfileSerializer understands.
  UI-only helper fields (nicheIsOther, interestsOtherActive,
  interestsOtherDraft) drive the "Other" input and are intentionally
  omitted from every payload.

  Edit / Save / Confirm flow now matches the Brand profile:
    - fields in a tab are locked until "Edit" is pressed
    - Cancel/Save only appear while editing
    - every action that could discard or persist unsaved work (switching
      tabs, cancelling, saving) routes through requestConfirm() so the
      user always gets an explicit yes/no first
    - tabs with unsaved edits show a small dot in the tab nav
    - a "Manage Funds" banner sits at the top of the Payments tab,
      mirroring the Brand profile's earnings shortcut

  Contact code persistence: contactCode is now also stored as its own
  explicit field in onboarding_data (not just baked into the combined
  "contact_number" string). Previously the code was re-derived from
  contact_number via splitContactNumber() on every reload — if the
  backend ever normalized/stripped that string, the regex would quietly
  fail to match and silently reset the selection back to the default
  country code. Reading the explicit field first avoids that.
*/

const ACCENT = "violet";

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

const LANGUAGES = [
  "English", "Hindi", "Spanish", "French", "German",
  "Mandarin", "Arabic", "Portuguese", "Bengali", "Japanese",
];

const NICHES = [
  "Gaming", "Beauty & fashion", "Tech", "Finance", "Comedy", "Music",
  "Food & cooking", "Fitness & health", "Travel", "Education", "Lifestyle", "Parenting",
];

const INTERESTS = [
  "Vlogging", "Tutorials", "Reviews", "Storytelling",
  "Live streaming", "Shorts / Reels", "Podcasts", "Collabs",
];

const SOCIAL_PLATFORMS = [
  { key: "youtube", label: "YouTube", icon: FaYoutube, color: "text-red-400", placeholder: "channel URL or @handle" },
  { key: "instagram", label: "Instagram", icon: FaInstagram, color: "text-pink-400", placeholder: "@handle" },
  { key: "facebook", label: "Facebook", icon: FaFacebook, color: "text-blue-400", placeholder: "page URL or @handle" },
  { key: "twitter", label: "X / Twitter", icon: FaXTwitter, color: "text-zinc-300", placeholder: "@handle" },
];

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "bank", label: "Bank Account" },
  { id: "debit", label: "Debit card" },
  { id: "credit", label: "Credit card" },
];

const TABS = [
  { id: "identity", label: "Identity", icon: UserRound },
  { id: "channel", label: "Channel", icon: Flame },
  { id: "about", label: "About", icon: BookOpen },
  { id: "payments", label: "Contact & Payments", icon: Wallet },
];

const STAT_ACCENTS = {
  violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
  cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
};

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
// default country code if nothing matches (e.g. a bare local number was
// stored previously, before this split existed, or the backend stripped
// the "+" prefix). This is now only a FALLBACK — buildInitialForm() below
// prefers an explicit onboarding_data.contactCode when present, so a
// failed parse here no longer silently resets the user's chosen code.
function splitContactNumber(raw) {
  if (!raw) return { code: DEFAULT_COUNTRY_CODE, number: "" };
  const match = String(raw)
    .trim()
    .match(/^(\+\d{1,4})[\s-]?(\d+)$/);
  if (match) return { code: match[1], number: match[2] };
  return { code: DEFAULT_COUNTRY_CODE, number: String(raw).replace(/\D/g, "") };
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

/* ------------------------------------------------------------------
   Per-tab validation — mirrors the Brand profile convention, one
   function per tab returning either an error string or null.
------------------------------------------------------------------ */
const VALIDATORS = {
  identity: (f) => {
    if (!f.username.trim()) return "Username is required.";
    if (f.username.trim().length < 6) return "Username must be at least 6 characters.";
    if (!f.firstName.trim()) return "First name is required.";
    if (!f.lastName.trim()) return "Last name is required.";

    if (!f.dob) return "Date of birth is required.";
    const dobDate = new Date(f.dob);
    if (Number.isNaN(dobDate.getTime())) return "Enter a valid date of birth.";
    if (dobDate > new Date()) return "Date of birth cannot be in the future.";
    const ageInYears = (Date.now() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageInYears < 13) return "You must be at least 13 years old.";
    if (ageInYears > 120) return "Enter a valid date of birth.";

    if (!f.gender) return "Please select a gender.";
    return null;
  },
  channel: (f) => {
    if (!f.niche.trim()) return "Please choose or enter a primary niche.";
    if (f.interests.length === 0) return "Select at least one content interest.";
    if (!hasAnyHandle(f.handles)) return "Add at least one platform handle.";
    if (f.portfolioUrl && !isValidUrl(f.portfolioUrl)) return "Please enter a valid portfolio URL.";
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
      if (!/^\d{9,18}$/.test(f.bankAccountNumber.trim()))
        return "Enter a valid account number (9–18 digits).";
      if (!f.bankIfsc.trim()) return "IFSC code is required.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.bankIfsc.trim().toUpperCase()))
        return "Enter a valid IFSC code (e.g. SBIN0001234).";
      if (!f.bankName.trim()) return "Bank name is required.";
    }

    if (f.paymentMethod === "debit" || f.paymentMethod === "credit") {
      if (!f.cardHolder.trim()) return "Cardholder name is required.";

      const cardDigits = f.cardNumber.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(cardDigits)) return "Enter a valid card number.";

      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(f.cardExpiry.trim())) return "Enter expiry as MM/YY.";
      const [expMonth, expYear] = f.cardExpiry.trim().split("/").map(Number);
      const expDate = new Date(2000 + expYear, expMonth);
      if (expDate <= new Date()) return "This card has expired.";

      if (!/^\d{3,4}$/.test(f.cardCvv.trim())) return "Enter a valid CVV.";
    }

    return null;
  },
};

/* ---------- helpers ---------- */

function buildInitialForm(profile = {}) {
  const onboardingData = profile?.onboarding_data || {};
  const profileHandles = profile?.handles;
  const onboardingHandles = onboardingData?.handles;
  // profile.handles may be {} (empty default dict from the DB) which is truthy.
  // Only use it if it has at least one non-empty key; otherwise fall through to
  // onboarding_data.handles.
  const hasRealHandles = profileHandles && Object.values(profileHandles).some((v) => v && v.trim());
  const handles = (hasRealHandles ? profileHandles : onboardingHandles) || {
    youtube: "", instagram: "", facebook: "", twitter: "",
  };
  const interests = onboardingData?.interests || [];
  const niche = onboardingData?.niche || "";

  const rawContact = profile?.contact_number || onboardingData?.contactNumber || "";
  const parsedContact = splitContactNumber(rawContact);
  // Prefer an explicitly stored country code over the regex-parsed one —
  // this is what survives a backend that normalizes/strips the raw
  // contact_number string (see splitContactNumber's comment above).
  const contactCode = onboardingData?.contactCode || parsedContact.code;
  const contactNumber = parsedContact.number;

  return {
    photo: profile?.avatar || null,
    cover: profile?.cover || null,
    username: profile?.username || onboardingData?.username || "",
    firstName: profile?.first_name || profile?.manager_first_name || "",
    lastName: profile?.last_name || profile?.manager_last_name || "",
    email: profile?.email || getStoredUser()?.email || "",
    role: profile?.user_type || "Creator",
    verified: false,
    dob: onboardingData?.dob || "",
    gender: onboardingData?.gender || "",
    niche,
    nicheIsOther: !!niche && !NICHES.includes(niche),
    interests,
    interestsOtherActive: false,
    interestsOtherDraft: "",
    handles,
    portfolioUrl: onboardingData?.portfolioUrl || "",
    bio: profile?.bio || onboardingData?.bio || "",
    languages: Array.isArray(profile?.languages) ? profile.languages : onboardingData?.languages || [],
    city: profile?.city || onboardingData?.city || "",
    state: profile?.state || onboardingData?.state || "",
    country: profile?.country || onboardingData?.country || "",
    contactCode,
    contactNumber,
    paymentMethod: profile?.payment_method || onboardingData?.paymentMethod || "upi",
    upiId: profile?.upi_id || onboardingData?.upiId || "",
    bankAccountHolder: profile?.bank_account_holder || onboardingData?.bankAccountHolder || "",
    bankAccountNumber: profile?.bank_account_number || onboardingData?.bankAccountNumber || "",
    bankIfsc: profile?.bank_ifsc || onboardingData?.bankIfsc || "",
    bankName: profile?.bank_name || onboardingData?.bankName || "",
    cardHolder: profile?.card_holder || onboardingData?.cardHolder || "",
    cardNumber: profile?.card_number || onboardingData?.cardNumber || "",
    cardExpiry: profile?.card_expiry || onboardingData?.cardExpiry || "",
    cardCvv: profile?.card_cvv || onboardingData?.cardCvv || "",
    emailNotifications: profile?.email_notifications ?? onboardingData?.emailNotifications ?? true,
    stats: {
      gigsPosted: profile?.clips_completed ?? 0,
      clippersWorked: 0,
      opportunitiesCompleted: 0,
      totalEarned: profile?.total_earnings ? `\u20B9${Number(profile.total_earnings).toLocaleString()}` : "\u20B90",
    },
  };
}

function buildPayloadForTab(tabId, form, existingOnboardingData = {}) {
  const combinedContact = `${form.contactCode}${form.contactNumber}`;

  const mergedOnboardingData = {
    ...existingOnboardingData,
    username: form.username,
    dob: form.dob,
    gender: form.gender,
    niche: form.niche,
    interests: form.interests,
    handles: form.handles,
    portfolioUrl: form.portfolioUrl,
    bio: form.bio,
    languages: form.languages,
    city: form.city,
    state: form.state,
    country: form.country,
    contactNumber: combinedContact,
    // Stored explicitly so the country-code selection survives a reload
    // even if contact_number itself comes back from the backend in a
    // normalized/stripped format that splitContactNumber() can't parse.
    contactCode: form.contactCode,
    paymentMethod: form.paymentMethod,
    upiId: form.upiId,
    bankAccountHolder: form.bankAccountHolder,
    bankAccountNumber: form.bankAccountNumber,
    bankIfsc: form.bankIfsc,
    bankName: form.bankName,
    cardHolder: form.cardHolder,
    cardNumber: form.cardNumber,
    cardExpiry: form.cardExpiry,
    emailNotifications: form.emailNotifications,
  };

  const payloadForTab = (() => {
    switch (tabId) {
      case "identity":
        return {
          username: form.username,
          first_name: form.firstName,
          last_name: form.lastName,
          onboarding_data: mergedOnboardingData,
        };
      case "channel":
        return {
          handles: form.handles,
          onboarding_data: mergedOnboardingData,
        };
      case "about":
        return {
          bio: form.bio,
          city: form.city,
          state: form.state,
          country: form.country,
          languages: form.languages,
          onboarding_data: mergedOnboardingData,
        };
      case "payments":
        return {
          contact_number: combinedContact,
          payment_method: form.paymentMethod,
          upi_id: form.upiId,
          bank_account_holder: form.bankAccountHolder,
          bank_account_number: form.bankAccountNumber,
          bank_ifsc: form.bankIfsc,
          bank_name: form.bankName,
          card_holder: form.cardHolder,
          card_number: form.cardNumber,
          card_expiry: form.cardExpiry,
          email_notifications: form.emailNotifications,
          onboarding_data: mergedOnboardingData,
        };
      default:
        return { onboarding_data: mergedOnboardingData };
    }
  })();

  const isDataUrl = (value) => typeof value === "string" && value.startsWith("data:image/");
  if (isDataUrl(form.photo)) {
    payloadForTab.avatar = form.photo;
  }
  if (isDataUrl(form.cover)) {
    payloadForTab.cover = form.cover;
  }

  return payloadForTab;
}

/* ---------- sub-components ---------- */

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
      {status === "saving" ? "Saving\u2026" : status === "saved" ? "Saved" : "Save changes"}
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

// Custom dropdown replacing a plain native <select> — matches the rest of
// the app's dropdown pattern: a button that toggles an animated floating
// options panel, click-outside to close.
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

/* ---------- main component ---------- */

export default function CreatorProfile() {
  const [tab, setTab] = useState("identity");
  const [form, setForm] = useState(() => buildInitialForm());
  const [profileData, setProfileData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingTabs, setEditingTabs] = useState({});
  const [snapshots, setSnapshots] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [confirmState, setConfirmState] = useState(null);

  const { showToast } = useToast();

  /* ---- load profile and dashboard stats on mount ---- */
  useEffect(() => {
    let mounted = true;

    const loadProfileAndStats = async () => {
      try {
        const [profileResponse, dashboardResponse] = await Promise.allSettled([
          api("/api/auth/profile/me/", { cache: "no-store", headers: { "Cache-Control": "no-store" } }),
          api("/api/creator/dashboard/?summary=true"),
        ]);

        if (!mounted) return;

        if (profileResponse.status === "fulfilled") {
          setProfileData(profileResponse.value);
          setForm(buildInitialForm(profileResponse.value));
          setLoadError("");
          setLoading(false);   
        } else {
          const msg = String(profileResponse.reason?.message || "").toLowerCase();
          const isAuthError =
            msg.includes("session") || msg.includes("expired") || msg.includes("unauthorized") || msg.includes("401") || msg.includes("token");

          if (isAuthError) {
            try {
              await hydrateAuthState();
              const retried = await api("/api/auth/profile/me/", {
                cache: "no-store",
                headers: { "Cache-Control": "no-store" },
              });
              if (mounted) {
                setProfileData(retried);
                setForm(buildInitialForm(retried));
                setLoadError("");
              }
            } catch {
              if (mounted) {
                const message = profileResponse.reason?.message || "Unable to load your profile right now.";
                setLoadError(message);
                showToast({ type: "error", message });
              }
            }
          } else {
            const message = profileResponse.reason?.message || "Unable to load your profile right now.";
            setLoadError(message);
            showToast({ type: "error", message });
          }
        }

        if (dashboardResponse.status === "fulfilled") {
          setDashboardStats(dashboardResponse.value);
        } else {
          console.warn("Creator dashboard stats failed to load:", dashboardResponse.reason);
        }
      } catch (err) {
        if (!mounted) return;
        const message = err?.message || "Unable to load your profile right now.";
        setLoadError(message);
        showToast({ type: "error", message });
      }
    };

    loadProfileAndStats();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <ProfileLoadingSkeleton tabCount={TABS.length} />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleLanguage = (lang) =>
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
    }));

  const toggleInterest = (value) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value) ? f.interests.filter((v) => v !== value) : [...f.interests, value],
    }));

  const selectNiche = (value) => setForm((f) => ({ ...f, niche: value, nicheIsOther: false }));
  const activateNicheOther = () =>
    setForm((f) => ({ ...f, nicheIsOther: true, niche: f.nicheIsOther ? f.niche : "" }));

  const addCustomInterest = () => {
    const value = form.interestsOtherDraft.trim();
    if (!value) return;
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value) ? f.interests : [...f.interests, value],
      interestsOtherDraft: "",
    }));
  };

  const updateHandle = (platform) => (e) =>
    setForm((f) => ({ ...f, handles: { ...f.handles, [platform]: e.target.value } }));

  const handleImageFile = (key) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fieldMap = { photo: "avatar", cover: "cover" };
    const bodyField = fieldMap[key];
    if (!bodyField) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setForm((f) => ({ ...f, [key]: dataUrl }));

      // Immediately persist the image to the backend so it survives a refresh.
      try {
        await api("/api/auth/profile/me/", {
          method: "PATCH",
          body: { [bodyField]: dataUrl },
        });
        showToast({ type: "success", message: `${key === "photo" ? "Profile photo" : "Cover photo"} updated.` });
      } catch (err) {
        showToast({
          type: "error",
          message: err?.message || `Failed to save ${key}. Please try again.`,
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
    setSaveStatus((s) => ({ ...s, [tabId]: "saving" }));

    try {
      const payload = buildPayloadForTab(tabId, form, profileData?.onboarding_data);
      const data = await api("/api/auth/profile/me/", {
        method: "PATCH",
        body: payload,
      });

      setProfileData(data);
      setForm(buildInitialForm(data));
      setSaveStatus((s) => ({ ...s, [tabId]: "saved" }));
      setEditingTabs((e) => ({ ...e, [tabId]: false }));
      setLoadError("");
      showToast({ type: "success", message: "Changes saved." });
      setTimeout(() => setSaveStatus((s) => ({ ...s, [tabId]: "idle" })), 1800);
    } catch (err) {
      setSaveStatus((s) => ({ ...s, [tabId]: "idle" }));
      const message = err?.message || "Something went wrong saving your changes. Please try again.";
      setLoadError(message);
      showToast({ type: "error", message });
    }
  };

  const handleSave = (tabId) => {
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

  const computedStats = {
    gigsPosted: dashboardStats?.stats?.total_gigs ?? form.stats.gigsPosted,
    clippersWorked: dashboardStats?.stats?.brand_deals ?? form.stats.clippersWorked,
    opportunitiesCompleted:
      dashboardStats?.stats?.campaign_participations ?? dashboardStats?.stats?.total_submissions ?? form.stats.opportunitiesCompleted,
    totalEarned:
      dashboardStats?.stats?.total_earnings != null
        ? `₹${Number(dashboardStats.stats.total_earnings).toLocaleString()}`
        : form.stats.totalEarned,
  };

  const statCards = [
    { label: "Gigs Posted", value: computedStats.gigsPosted, icon: Megaphone, accent: "violet" },
    { label: "Clippers Worked With", value: computedStats.clippersWorked, icon: Users, accent: "cyan" },
    { label: "Opportunities Completed", value: computedStats.opportunitiesCompleted, icon: Briefcase, accent: "amber" },
    { label: "Total Earned", value: computedStats.totalEarned, icon: IndianRupee, accent: "emerald" },
  ];

  const customInterests = form.interests.filter((v) => !INTERESTS.includes(v));

  return (
    <div>
      <ConfirmDialog state={confirmState} onCancel={closeConfirm} />

      <Breadcrumbs />

      {loadError && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </div>
      )}

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="group relative h-36 sm:h-44">
          {form.cover ? (
            <img src={resolveImageUrl(form.cover)} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-500/25 via-violet-500/5 to-transparent" />
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
          {/* Fix: -mt-10 now scoped to just the avatar box (matches
              ClipperProfile.jsx). Previously it sat on this whole flex
              row, so the name/username text got pulled up under the
              cover image too on narrow screens where the row stacks
              vertically — that was the overflow bug. */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="-mt-10 group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#0A0A0F] bg-[#11111A]">
              {form.photo ? (
                <img src={resolveImageUrl(form.photo)} alt="Photo" className="h-full w-full object-cover" />
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

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">
                  {form.firstName} {form.lastName}
                </h1>
                {form.verified && (
                  <BadgeCheck size={18} className="text-violet-400" />
                )}
              </div>
              <p className="text-sm text-zinc-400">{form.username ? `@${form.username}` : form.niche}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
            {(form.city || form.country) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {[form.city, form.country].filter(Boolean).join(", ")}
              </span>
            )}
            {form.portfolioUrl && (
              <a
                href={form.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 transition hover:text-violet-400"
              >
                <Globe size={14} />
                {form.portfolioUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
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

                <Field label="Username" required hint="At least 6 characters. Shown on your public profile">
                  <Input
                    accent={ACCENT}
                    value={form.username}
                    onChange={set("username")}
                    placeholder="yourcreatorname"
                    disabled={!editingTabs.identity}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="First name" required>
                    <Input accent={ACCENT} value={form.firstName} onChange={set("firstName")} disabled={!editingTabs.identity} />
                  </Field>
                  <Field label="Last name" required>
                    <Input accent={ACCENT} value={form.lastName} onChange={set("lastName")} disabled={!editingTabs.identity} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of birth" required>
                    <Input
                      accent={ACCENT}
                      type="date"
                      value={form.dob}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={set("dob")}
                      disabled={!editingTabs.identity}
                    />
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
                  <SaveButton status={saveStatus.identity ?? "idle"} onClick={() => handleSave("identity")} />
                </div>
              )}
            </div>
          )}

          {tab === "channel" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.channel} onEdit={() => startEdit("channel")} />

              <div className={`space-y-6 ${!editingTabs.channel ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Primary niche" required hint="Pick one \u2014 or choose Other to enter your own">
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map((n) => (
                      <Chip
                        key={n}
                        label={n}
                        selected={!form.nicheIsOther && form.niche === n}
                        onClick={() => selectNiche(n)}
                        disabled={!editingTabs.channel}
                      />
                    ))}
                    <Chip
                      label="Other"
                      selected={form.nicheIsOther}
                      onClick={activateNicheOther}
                      disabled={!editingTabs.channel}
                    />
                  </div>
                  {form.nicheIsOther && (
                    <div className="mt-3">
                      <Input
                        accent={ACCENT}
                        placeholder="Type your niche"
                        value={form.niche}
                        onChange={set("niche")}
                        disabled={!editingTabs.channel}
                      />
                    </div>
                  )}
                </Field>

                <Field label="Content interests" required hint="Select all that apply \u2014 or add your own">
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((i) => (
                      <Chip
                        key={i}
                        label={i}
                        selected={form.interests.includes(i)}
                        onClick={() => toggleInterest(i)}
                        disabled={!editingTabs.channel}
                      />
                    ))}
                    {customInterests.map((custom) => (
                      <Chip
                        key={custom}
                        label={`${custom} \u2715`}
                        selected
                        onClick={() => toggleInterest(custom)}
                        disabled={!editingTabs.channel}
                      />
                    ))}
                    <Chip
                      label="Other"
                      selected={form.interestsOtherActive}
                      onClick={() => setForm((f) => ({ ...f, interestsOtherActive: !f.interestsOtherActive }))}
                      disabled={!editingTabs.channel}
                    />
                  </div>
                  {form.interestsOtherActive && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        accent={ACCENT}
                        placeholder="Type a custom interest and press Enter"
                        value={form.interestsOtherDraft}
                        onChange={set("interestsOtherDraft")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomInterest();
                          }
                        }}
                        disabled={!editingTabs.channel}
                      />
                      <button
                        type="button"
                        onClick={addCustomInterest}
                        disabled={!editingTabs.channel}
                        className={`shrink-0 rounded-lg px-4 text-sm font-semibold text-[#0A0A0F] transition ${accentStyles[ACCENT].solidBtn}`}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </Field>

                <Field label="Platform handles" required hint="At least one">
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
                          disabled={!editingTabs.channel}
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
                    disabled={!editingTabs.channel}
                  />
                </Field>
              </div>

              {editingTabs.channel && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("channel")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.channel ?? "idle"} onClick={() => handleSave("channel")} />
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
                  <SaveButton status={saveStatus.about ?? "idle"} onClick={() => handleSave("about")} />
                </div>
              )}
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">Need to withdraw your earnings?</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Manage your funds to withdraw what you've earned from completed gigs.
                  </p>
                </div>
                <Link
                  to="/creator/earnings"
                  className={`inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-[#0A0A0F] transition ${accentStyles[ACCENT].solidBtn}`}
                >
                  Manage Funds
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
                    {PAYMENT_METHODS.map((method) => (
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
                      <Input accent={ACCENT} value={form.bankName} onChange={set("bankName")} disabled={!editingTabs.payments} />
                    </Field>
                  </div>
                )}

                {(form.paymentMethod === "debit" || form.paymentMethod === "credit") && (
                  <div className="space-y-4">
                    <Field label="Cardholder name" required>
                      <Input
                        accent={ACCENT}
                        value={form.cardHolder}
                        onChange={set("cardHolder")}
                        placeholder="Name as it appears on the card"
                        disabled={!editingTabs.payments}
                      />
                    </Field>

                    <Field label="Card number" required>
                      <Input
                        accent={ACCENT}
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={form.cardNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 19);
                          const grouped = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                          setForm((f) => ({ ...f, cardNumber: grouped }));
                        }}
                        disabled={!editingTabs.payments}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Expiry" required hint="MM/YY">
                        <Input
                          accent={ACCENT}
                          inputMode="numeric"
                          placeholder="MM/YY"
                          value={form.cardExpiry}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                            const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                            setForm((f) => ({ ...f, cardExpiry: formatted }));
                          }}
                          disabled={!editingTabs.payments}
                        />
                      </Field>
                      <Field label="CVV" required>
                        <Input
                          accent={ACCENT}
                          type="password"
                          inputMode="numeric"
                          placeholder="•••"
                          value={form.cardCvv}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setForm((f) => ({ ...f, cardCvv: digits }));
                          }}
                          disabled={!editingTabs.payments}
                        />
                      </Field>
                    </div>

                    <p className="text-xs text-zinc-500">
                      Card details are transmitted securely and your CVV is never stored.
                    </p>
                  </div>
                )}

                <ToggleRow
                  label="Email notifications"
                  hint="Niche-specific content and community activity"
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
                  <SaveButton status={saveStatus.payments ?? "idle"} onClick={() => handleSave("payments")} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}