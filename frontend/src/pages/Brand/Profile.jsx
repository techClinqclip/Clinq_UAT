import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserRound,
  BookOpen,
  Share2,
  Wallet,
  Check,
  Building2,
  BadgeCheck,
  Globe,
  MapPin,
  ExternalLink,
  Megaphone,
  Users,
  Camera,
  Pencil,
  AlertTriangle,
  Eye,
  ChevronDown,
} from "lucide-react";
import { FaInstagram, FaYoutube, FaFacebook, FaXTwitter } from "react-icons/fa6";
import {
  Field,
  Input,
  TextArea,
  ChipGroup,
  accentStyles,
} from "../../onboarding/Layout";
import { api } from "../../lib/api";
import { resolveImageUrl } from "../../lib/media";
import { getStoredUser, hydrateAuthState } from "../../lib/auth";
import useToast from "../../hooks/useToast";
import ProfileLoadingSkeleton from "../../shared/ui/ProfileLoadingSkeleton";

/*
  Profile — the editable settings page (as opposed to profilesetup.jsx,
  the one-time onboarding wizard). Reuses the same field primitives and
  the same "Common" field set, but:
    - pre-filled from existing user data instead of starting blank
    - organized as tabbed sections instead of a linear step flow
    - each section saves independently instead of one "Continue" chain
    - Role and Email are shown read-only — role is set at signup/role
      selection, email changes should go through their own verification
      flow, neither belongs in a quick-edit settings form

  Edit / Save / Confirm flow now matches the Clipper profile: fields in
  a tab are locked until "Edit" is pressed, Cancel/Save only appear
  while editing, and every action that could discard or persist unsaved
  work (switching tabs, cancelling, saving) routes through
  requestConfirm() so the user always gets an explicit yes/no first.

  MOCK_USER below stands in for whatever your real user/auth context
  provides — swap it for that when wiring this up. `verified` is shown
  as a static flag here; it should be backend-controlled once you have
  an actual verification process.
*/

const MOCK_USER = {
  photo: null,
  cover: null,
  firstName: "John",
  lastName: "Doe",
  username: "acmepodcasts",
  email: "john@example.com",
  role: "Brand",
  gender: "Male",
  bio: "Building campaigns that creators actually want to join.",
  languages: ["English", "Hindi"],
  city: "Jaipur",
  state: "Rajasthan",
  country: "India",
  handles: { instagram: "@acme", youtube: "", facebook: "", twitter: "@acme" },
  paymentMethod: "upi",
  upiId: "john@upi",

  bankAccountHolder: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankName: "",

  cardHolder: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",

  emailNotifications: true,

  verified: true,
  companyName: "Acme Inc.",
  brandName: "Acme Podcasts",
  website: "https://acmepodcasts.com",
  industry: "Podcast",
  companySize: "11-50",
  foundedYear: "2019",
  aboutCompany:
    "Acme Podcasts produces long-form interview shows and helps clippers turn full episodes into shareable moments.",

  stats: {},
};

const ACCENT = "cyan"; // derive from MOCK_USER.role in a real integration

const formatCompact = (n) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n) || 0);

const formatMoney = (n) => `₹${formatCompact(Number(n) || 0)}`;

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

const LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Arabic",
  "Portuguese",
  "Bengali",
  "Japanese",
];

const INDUSTRIES = [
  "Podcast",
  "Gaming",
  "Finance",
  "Technology",
  "Education",
  "Fitness",
  "Lifestyle",
  "Entertainment",
  "Business",
  "Other",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "200+"];

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "bank", label: "Bank Account" },
  { id: "debit", label: "Debit card" },
  { id: "credit", label: "Credit card" },
];

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: FaInstagram, color: "text-pink-400", placeholder: "@handle" },
  { key: "youtube", label: "YouTube", icon: FaYoutube, color: "text-red-400", placeholder: "channel URL or @handle" },
  { key: "facebook", label: "Facebook", icon: FaFacebook, color: "text-blue-400", placeholder: "page URL or @handle" },
  { key: "twitter", label: "X / Twitter", icon: FaXTwitter, color: "text-zinc-300", placeholder: "@handle" },
];

const TABS = [
  { id: "identity", label: "Identity", icon: UserRound },
  { id: "company", label: "Company", icon: Building2 },
  { id: "about", label: "About", icon: BookOpen },
  { id: "social", label: "Social", icon: Share2 },
  { id: "payments", label: "Payments", icon: Wallet },
];

const STAT_ACCENTS = {
  violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
  cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
};

// Country codes for the manager contact number — expand this list as
// needed. `digits` drives the length validation for that country.
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

const formatDomain = (url) => (url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "");

const CURRENT_YEAR = new Date().getFullYear();

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (value) => {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

// Splits a stored contact string like "+919876543210" or "+91 9876543210"
// back into { code, number } for the two-field UI. Falls back to the
// default country code if nothing matches (e.g. a bare local number was
// stored previously, before this split existed).
function splitContactNumber(raw) {
  if (!raw) return { code: DEFAULT_COUNTRY_CODE, number: "" };
  const match = String(raw)
    .trim()
    .match(/^(\+\d{1,4})[\s-]?(\d+)$/);
  if (match) return { code: match[1], number: match[2] };
  return { code: DEFAULT_COUNTRY_CODE, number: String(raw).replace(/\D/g, "") };
}

/* ------------------------------------------------------------------
   Per-tab validation — mirrors the Clipper profile convention, one
   function per tab returning either an error string or null.
------------------------------------------------------------------ */
const VALIDATORS = {
  identity: (f) => {
    if (!f.username.trim()) return "Username is required.";
    if (f.username.trim().length < 6) return "Username must be at least 6 characters.";
    if (!f.managerFirstName.trim()) return "Manager first name is required.";
    if (!f.managerLastName.trim()) return "Manager last name is required.";
    if (!f.managerRole.trim()) return "Manager role is required.";

    if (!f.managerContactNumber.trim()) return "Manager contact number is required.";
    if (!/^\d+$/.test(f.managerContactNumber.trim())) return "Contact number must contain digits only.";
    const expected = COUNTRY_CODES.find((c) => c.code === f.managerContactCode)?.digits;
    if (expected && f.managerContactNumber.trim().length !== expected) {
      return `Enter a valid ${f.managerContactCode} number (${expected} digits).`;
    }

    if (!f.companyEmail.trim()) return "Company email is required.";
    if (!isValidEmail(f.companyEmail)) return "Please enter a valid company email.";
    if (f.managerEmail && !isValidEmail(f.managerEmail)) return "Please enter a valid personal email.";
    if (!f.gender) return "Please select a gender.";
    return null;
  },
  company: (f) => {
    if (!f.companyName.trim()) return "Company name is required.";
    if (!f.brandName.trim()) return "Brand name is required.";
    if (!f.industry) return "Please select an industry.";
    if (f.website && !isValidUrl(f.website)) return "Please enter a valid website URL.";
    if (f.foundedYear) {
      const year = Number(f.foundedYear);
      if (!/^\d{4}$/.test(f.foundedYear) || year < 1900 || year > CURRENT_YEAR) {
        return `Founded year must be a 4-digit year between 1900 and ${CURRENT_YEAR}.`;
      }
    }
    return null;
  },
  about: (f) => {
    if (f.languages.length === 0) return "Select at least one language.";
    if (!f.city.trim()) return "City is required.";
    if (!f.country.trim()) return "Country is required.";
    return null;
  },
  social: () => null,
  payments: (f) => {
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

function buildInitialForm(profile = {}) {
  const source = profile && Object.keys(profile).length ? profile : MOCK_USER;
  const onboardingData = source?.onboarding_data || {};
  const handles = source?.handles || onboardingData?.handles || {
    instagram: "",
    youtube: "",
    facebook: "",
    twitter: "",
  };

  const rawContact = source?.manager_contact || onboardingData?.managerContact || source?.managerContact || "";
  const { code: managerContactCode, number: managerContactNumber } = splitContactNumber(rawContact);

  return {
    photo: resolveImageUrl(source?.avatar || source?.photo || null) || null,
    cover: resolveImageUrl(source?.cover || null) || null,
    firstName: source?.first_name || "",
    lastName: source?.last_name || "",
    username: source?.username || onboardingData?.username || source?.handle || "",
    email: source?.email || getStoredUser()?.email || MOCK_USER.email,
    role: source?.user_type || source?.role || "Brand",
    gender: onboardingData?.gender || source?.gender || "",
    bio: source?.bio || onboardingData?.bio || "",
    languages: Array.isArray(onboardingData?.languages) ? onboardingData.languages : source?.languages || [],
    city: source?.city || onboardingData?.city || "",
    state: source?.state || onboardingData?.state || "",
    country: source?.country || onboardingData?.country || "",
    handles: {
      instagram: handles.instagram || "",
      youtube: handles.youtube || "",
      facebook: handles.facebook || "",
      twitter: handles.twitter || "",
    },
    paymentMethod: source?.payment_method || onboardingData?.paymentMethod || source?.paymentMethod || "upi",
    upiId: source?.upi_id || onboardingData?.upiId || source?.upiId || "",
    bankAccountHolder: source?.bank_account_holder || onboardingData?.bankAccountHolder || "",
    bankAccountNumber: source?.bank_account_number || onboardingData?.bankAccountNumber || "",
    bankIfsc: source?.bank_ifsc || onboardingData?.bankIfsc || "",
    bankName: source?.bank_name || onboardingData?.bankName || "",
    cardHolder: source?.card_holder || onboardingData?.cardHolder || "",
    cardNumber: source?.card_number || onboardingData?.cardNumber || "",
    cardExpiry: source?.card_expiry || onboardingData?.cardExpiry || "",
    cardCvv: source?.card_cvv || onboardingData?.cardCvv || "",
    emailNotifications: Boolean(source?.email_notifications ?? onboardingData?.emailNotifications ?? MOCK_USER.emailNotifications),
    verified: Boolean(source?.company_name || source?.brand_name || source?.verified || MOCK_USER.verified),
    companyName: source?.company_name || onboardingData?.companyName || source?.companyName || "",
    brandName: source?.brand_name || onboardingData?.brandName || source?.brandName || "",
    website: source?.website_url || onboardingData?.website || source?.website || "",
    industry: source?.industry || onboardingData?.industry || source?.industry || "",
    companySize: source?.company_size || onboardingData?.companySize || source?.companySize || "",
    foundedYear: source?.founded_year ? String(source.founded_year) : onboardingData?.foundedYear || source?.foundedYear || "",
    aboutCompany: source?.company_description || onboardingData?.aboutCompany || source?.aboutCompany || "",
    managerFirstName: source?.manager_first_name || onboardingData?.managerFirstName || source?.managerFirstName || "",
    managerLastName: source?.manager_last_name || onboardingData?.managerLastName || source?.managerLastName || "",
    managerRole: source?.manager_role || onboardingData?.managerRole || source?.managerRole || "",
    managerContactCode: managerContactCode,
    managerContactNumber: managerContactNumber,
    managerEmail: source?.manager_email || onboardingData?.managerEmail || source?.managerEmail || "",
    companyEmail: source?.company_email || onboardingData?.companyEmail || source?.companyEmail || "",
    stats: source?.stats || MOCK_USER.stats,
  };
}

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

// Custom dropdown replacing the plain native <select> — matches the rest
// of the app's dropdown pattern (ProfileMenu/NotificationBell): a button
// that toggles an animated floating options panel, click-outside to close.
function NiceSelect({ value, onChange, options, disabled, placeholder = "Select", menuClassName = "w-full" }) {
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
        <span className={`truncate ${selected ? "text-white" : "text-zinc-500"}`} title={selected?.label}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#15151F] p-1.5 shadow-2xl ${menuClassName}`}
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
export default function Profile() {
  // FIX: previously hardcoded to "identity" regardless of URL, so
  // AddFundsModal's "Change" link (?tab=payments) never actually landed
  // on the Payments tab. Now reads the tab from the query string on load.
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : "identity");

  const [form, setForm] = useState(() => buildInitialForm(MOCK_USER));
  const [editingTabs, setEditingTabs] = useState({});
  const [snapshots, setSnapshots] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [budgetMetrics, setBudgetMetrics] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true); // ADD THIS

  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const [profileResponse, dashboardResponse, budgetResponse] = await Promise.all([
          api("/api/auth/profile/me/", {
            cache: "no-store",
            headers: { "Cache-Control": "no-store" },
          }),
          api("/api/content/campaigns/dashboard/", { cache: "no-store" }),
          api("/api/content/campaigns/budget/", { cache: "no-store" }),
        ]);
        if (!mounted) return;

        setProfileData(profileResponse);
        setDashboardMetrics(dashboardResponse || null);
        setBudgetMetrics(budgetResponse || null);
        setForm(buildInitialForm(profileResponse));
        setLoadError("");
        setLoading(false);  
      } catch (error) {
        const msg = String(error?.message || "").toLowerCase();
        const isAuthError = msg.includes("session") || msg.includes("expired") || msg.includes("unauthorized") || msg.includes("401") || msg.includes("token");
        if (mounted && isAuthError) {
          try {
            await hydrateAuthState();
            const [profileResponse, dashboardResponse, budgetResponse] = await Promise.all([
              api("/api/auth/profile/me/", { cache: "no-store", headers: { "Cache-Control": "no-store" } }),
              api("/api/content/campaigns/dashboard/", { cache: "no-store" }),
              api("/api/content/campaigns/budget/", { cache: "no-store" }),
            ]);
            if (mounted) {
              setProfileData(profileResponse);
              setDashboardMetrics(dashboardResponse || null);
              setBudgetMetrics(budgetResponse || null);
              setForm(buildInitialForm(profileResponse));
              setLoadError("");
            }
            return;
          } catch {
            // fallthrough to show the original error
          }
        }
        if (mounted) {
          const message = error.message || "Unable to load your profile right now.";
          setLoadError(message);
          showToast({ type: "error", message });
        }
      }
    };

    loadProfile();

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
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));
  const updateHandle = (platform) => (e) =>
    setForm((f) => ({ ...f, handles: { ...f.handles, [platform]: e.target.value } }));

  const handleImageFile = (key) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const backendField = key === "photo" ? "avatar" : "cover";
    const reader = new FileReader();
    reader.onload = async () => {
      const value = reader.result;
      setForm((f) => ({ ...f, [key]: value }));

      try {
        await api("/api/auth/profile/me/", {
          method: "PATCH",
          body: { [backendField]: value },
        });
        setProfileData((current) => ({ ...current, [backendField]: value }));
        setLoadError("");
        showToast({ type: "success", message: `${key === "photo" ? "Profile photo" : "Cover photo"} updated.` });
      } catch (error) {
        showToast({
          type: "error",
          message: error?.message || "Failed to upload image. Please try again.",
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

  const isDataUrl = (value) => typeof value === "string" && value.startsWith("data:");

  const buildPayloadForTab = (tabId) => {
    const onboardingData = profileData?.onboarding_data || {};
    const combinedContact = `${form.managerContactCode} ${form.managerContactNumber}`;

    const mergedOnboardingData = {
      ...onboardingData,
      username: form.username,
      gender: form.gender,
      languages: form.languages,
      city: form.city,
      state: form.state,
      country: form.country,
      handles: form.handles,
      companyName: form.companyName,
      brandName: form.brandName,
      website: form.website,
      industry: form.industry,
      companySize: form.companySize,
      foundedYear: form.foundedYear,
      aboutCompany: form.aboutCompany,
      managerFirstName: form.managerFirstName,
      managerLastName: form.managerLastName,
      managerRole: form.managerRole,
      managerContact: combinedContact,
      managerEmail: form.managerEmail,
      companyEmail: form.companyEmail,
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
      bio: form.bio,
    };

    switch (tabId) {
      case "identity":
        return {
          username: form.username,
          manager_first_name: form.managerFirstName,
          manager_last_name: form.managerLastName,
          manager_role: form.managerRole,
          // NOTE: combined as "+91XXXXXXXXXX" — verify this matches what
          // your backend expects. If it wants code/number as separate
          // fields instead, swap this for manager_contact_code /
          // manager_contact_number and adjust splitContactNumber's
          // caller (buildInitialForm) to match.
          manager_contact: combinedContact,
          manager_email: form.managerEmail,
          company_email: form.companyEmail,
          onboarding_data: mergedOnboardingData,
        };
      case "company":
        return {
          company_name: form.companyName,
          brand_name: form.brandName,
          website_url: form.website,
          company_description: form.aboutCompany,
          industry: form.industry,
          company_size: form.companySize,
          founded_year: form.foundedYear ? Number(form.foundedYear) : null,
          onboarding_data: mergedOnboardingData,
        };
      case "about":
        return {
          bio: form.bio,
          city: form.city,
          state: form.state,
          country: form.country,
          location: [form.city, form.state, form.country].filter(Boolean).join(", "),
          languages: form.languages,
          onboarding_data: mergedOnboardingData,
        };
      case "social":
        return {
          handles: form.handles,
          onboarding_data: {
            ...mergedOnboardingData,
            handles: form.handles,
          },
        };
      case "payments":
        return {
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
          onboarding_data: {
            ...mergedOnboardingData,
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
          },
        };

      default:
        return {};
    }
  };

  const performSave = async (tabId) => {
    setSaveStatus((s) => ({ ...s, [tabId]: "saving" }));

    try {
      const payload = buildPayloadForTab(tabId);
      if (isDataUrl(form.photo)) payload.avatar = form.photo;
      if (isDataUrl(form.cover)) payload.cover = form.cover;

      const data = await api("/api/auth/profile/me/", {
        method: "PATCH",
        body: payload,
      });

      setProfileData(data);
      setForm(buildInitialForm(data));
      if (data?.avatar || data?.cover) {
        setDashboardMetrics((current) => current || null);
      }
      setSaveStatus((s) => ({ ...s, [tabId]: "saved" }));
      setEditingTabs((e) => ({ ...e, [tabId]: false }));
      setLoadError("");
      showToast({ type: "success", message: "Changes saved." });
      window.setTimeout(() => setSaveStatus((s) => ({ ...s, [tabId]: "idle" })), 1800);
    } catch (error) {
      setSaveStatus((s) => ({ ...s, [tabId]: "idle" }));
      const message = error.message || "Unable to save your changes right now.";
      setLoadError(message);
      showToast({ type: "error", message });
    }
  };

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

  const realStats = {
    campaignsCreated: Number(dashboardMetrics?.total_campaigns ?? form?.stats?.campaignsCreated ?? 0),
    viewsGenerated: Number(dashboardMetrics?.views_generated ?? form?.stats?.viewsGenerated ?? 0),
    budgetSpent: Number(budgetMetrics?.total_spent ?? dashboardMetrics?.total_earnings ?? form?.stats?.budgetSpent ?? 0),
    creatorsWorked: Number(dashboardMetrics?.creators_worked_with ?? form?.stats?.creatorsWorked ?? 0),
  };

  const statCards = [
    { label: "Campaigns Created", value: realStats.campaignsCreated.toLocaleString("en-IN"), icon: Megaphone, accent: "violet" },
    { label: "Views Generated", value: formatCompact(realStats.viewsGenerated), icon: Eye, accent: "cyan" },
    { label: "Budget Spent", value: formatMoney(realStats.budgetSpent), icon: Wallet, accent: "emerald" },
    { label: "Creators Worked With", value: realStats.creatorsWorked.toLocaleString("en-IN"), icon: Users, accent: "amber" },
  ];

  return (
    <div>
      <ConfirmDialog state={confirmState} onCancel={closeConfirm} />

      {loadError && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </div>
      )}

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="group relative h-36 sm:h-44">
          {form.cover ? (
            <img src={form.cover} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-cyan-500/25 via-cyan-500/5 to-transparent" />
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
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile("cover")}
          />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="-mt-10 group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#0A0A0F] bg-[#11111A]">
              {form.photo ? (
                <img src={form.photo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 size={28} className="text-zinc-600" />
              )}

              <label
                htmlFor="photo-upload"
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100"
              >
                <Camera size={16} className="text-white" />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFile("photo")}
              />
            </div>

            <div className="min-w-0 pb-1 pt-2 sm:pt-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-2xl font-bold text-white">{form.brandName || form.companyName}</h1>
                {form.verified && (
                  <BadgeCheck size={19} className={`shrink-0 ${accentStyles[ACCENT].iconText}`} title="Verified brand" />
                )}
              </div>
              <p className="truncate text-sm text-zinc-400">
                {form.industry} {form.username && `· @${form.username}`}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
            {(form.city || form.country) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {[form.city, form.country].filter(Boolean).join(", ")}
              </span>
            )}
            {form.website && (
              <a
                href={form.website}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-1.5 transition hover:${accentStyles[ACCENT].iconText}`}
              >
                <Globe size={14} />
                {formatDomain(form.website)}
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
                <p className="text-xs text-zinc-500">
                  Update your photo and cover image from the header above.
                </p>

                <Field label="Username" required hint="At least 6 characters. Shown on your public profile">
                  <Input
                    accent={ACCENT}
                    value={form.username}
                    onChange={set("username")}
                    placeholder="yourbrand"
                    disabled={!editingTabs.identity}
                  />
                </Field>

                <p className="mb-1 text-sm font-medium text-white">Manager details</p>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="First name" required>
                    <Input
                      accent={ACCENT}
                      value={form.managerFirstName}
                      onChange={set("managerFirstName")}
                      disabled={!editingTabs.identity}
                    />
                  </Field>
                  <Field label="Last name" required>
                    <Input
                      accent={ACCENT}
                      value={form.managerLastName}
                      onChange={set("managerLastName")}
                      disabled={!editingTabs.identity}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Role" hint="This is the manager's role in your company" required>
                    <Input
                      accent={ACCENT}
                      value={form.managerRole}
                      onChange={set("managerRole")}
                      disabled={!editingTabs.identity}
                    />
                  </Field>

                  <Field label="Contact number" required hint="Country code + digits only">
                    <div className="flex gap-2">
                      <div className="w-36 shrink-0">
                        <NiceSelect
                          value={form.managerContactCode}
                          onChange={(v) => setForm((f) => ({ ...f, managerContactCode: v }))}
                          options={COUNTRY_CODES.map((c) => ({ value: c.code, label: `${c.code} ${c.country}` }))}
                          disabled={!editingTabs.identity}
                          menuClassName="w-56 custom-scrollbar"
                        />
                      </div>
                      <Input
                        accent={ACCENT}
                        inputMode="numeric"
                        placeholder="9876543210"
                        value={form.managerContactNumber}
                        onChange={(e) => {
                          const maxLen = COUNTRY_CODES.find((c) => c.code === form.managerContactCode)?.digits || 15;
                          const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                          setForm((f) => ({ ...f, managerContactNumber: digits }));
                        }}
                        disabled={!editingTabs.identity}
                      />
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Personal email">
                    <Input
                      accent={ACCENT}
                      type="email"
                      value={form.managerEmail}
                      onChange={set("managerEmail")}
                      disabled={!editingTabs.identity}
                    />
                  </Field>

                  <Field label="Company email" required>
                    <Input
                      accent={ACCENT}
                      type="email"
                      value={form.companyEmail}
                      onChange={set("companyEmail")}
                      disabled={!editingTabs.identity}
                    />
                  </Field>
                </div>

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

          {tab === "company" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.company} onEdit={() => startEdit("company")} />

              <div className={`space-y-6 ${!editingTabs.company ? "pointer-events-none opacity-60" : ""}`}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Company name" required>
                    <Input
                      accent={ACCENT}
                      value={form.companyName}
                      onChange={set("companyName")}
                      disabled={!editingTabs.company}
                    />
                  </Field>
                  <Field label="Brand name" required hint="Public-facing name">
                    <Input
                      accent={ACCENT}
                      value={form.brandName}
                      onChange={set("brandName")}
                      disabled={!editingTabs.company}
                    />
                  </Field>
                </div>

                <Field label="Website">
                  <Input
                    accent={ACCENT}
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={form.website}
                    onChange={set("website")}
                    disabled={!editingTabs.company}
                  />
                  {form.website && (
                    <a
                      href={form.website}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-2 flex w-fit items-center gap-1.5 text-xs ${accentStyles[ACCENT].iconText} hover:opacity-80`}
                    >
                      <Globe size={12} />
                      {formatDomain(form.website)}
                      <ExternalLink size={11} />
                    </a>
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Industry" required hint="Helps with campaign recommendations">
                    <NiceSelect
                      value={form.industry}
                      onChange={(v) => setForm((f) => ({ ...f, industry: v }))}
                      options={INDUSTRIES}
                      placeholder="Select industry"
                      disabled={!editingTabs.company}
                    />
                  </Field>

                  <Field label="Company size">
                    <NiceSelect
                      value={form.companySize}
                      onChange={(v) => setForm((f) => ({ ...f, companySize: v }))}
                      options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} employees` }))}
                      placeholder="Select company size"
                      disabled={!editingTabs.company}
                    />
                  </Field>
                </div>

                <Field label="Founded year" hint={`Optional — a 4-digit year between 1900 and ${CURRENT_YEAR}`}>
                  <Input
                    accent={ACCENT}
                    type="text"
                    inputMode="numeric"
                    placeholder="2019"
                    value={form.foundedYear}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setForm((f) => ({ ...f, foundedYear: digits }));
                    }}
                    disabled={!editingTabs.company}
                    className="max-w-[160px]"
                  />
                </Field>

                <Field label="About company" hint="Separate from your personal bio">
                  <TextArea
                    accent={ACCENT}
                    rows={4}
                    placeholder="What does your company do, and what should creators know about working with you?"
                    value={form.aboutCompany}
                    onChange={set("aboutCompany")}
                    disabled={!editingTabs.company}
                  />
                </Field>
              </div>

              {editingTabs.company && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("company")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.company ?? "idle"} onClick={() => handleSaveClick("company")} />
                </div>
              )}
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.about} onEdit={() => startEdit("about")} />

              <div className={`space-y-6 ${!editingTabs.about ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Bio" hint="Personal — shown as the account holder's bio">
                  <TextArea accent={ACCENT} rows={3} value={form.bio} onChange={set("bio")} disabled={!editingTabs.about} />
                </Field>

                <Field label="Languages" required hint="Select all that apply">
                  <ChipGroup
                    options={LANGUAGES}
                    selected={form.languages}
                    onToggle={toggleLanguage}
                    accent={ACCENT}
                  />
                </Field>

                <Field label="Location" required>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Input
                      accent={ACCENT}
                      placeholder="City"
                      value={form.city}
                      onChange={set("city")}
                      disabled={!editingTabs.about}
                    />
                    <Input
                      accent={ACCENT}
                      placeholder="State"
                      value={form.state}
                      onChange={set("state")}
                      disabled={!editingTabs.about}
                    />
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

          {tab === "social" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.social} onEdit={() => startEdit("social")} />

              <div className={`space-y-6 ${!editingTabs.social ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Platform handles" hint="Optional">
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
                          disabled={!editingTabs.social}
                        />
                      </div>
                    ))}
                  </div>
                </Field>
              </div>

              {editingTabs.social && (
                <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                  <button
                    onClick={() => handleCancelClick("social")}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <SaveButton status={saveStatus.social ?? "idle"} onClick={() => handleSaveClick("social")} />
                </div>
              )}
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">Need to fund a campaign?</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Add funds to your wallet to launch campaigns and pay creators on time.
                  </p>
                </div>
                <Link
                  to="/brand/earnings"
                  className={`inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-[#0A0A0F] transition ${accentStyles[ACCENT].solidBtn}`}
                >
                  Manage Funds
                </Link>
              </div>

              <EditControl isEditing={editingTabs.payments} onEdit={() => startEdit("payments")} />

              <div className={`space-y-6 ${!editingTabs.payments ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Payout method" required>
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
                    <Input
                      accent={ACCENT}
                      value={form.upiId}
                      onChange={set("upiId")}
                      disabled={!editingTabs.payments}
                    />
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

                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emailNotifications: !f.emailNotifications }))}
                  disabled={!editingTabs.payments}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/20"
                >
                  <div>
                    <span className="text-sm text-zinc-300">Email notifications</span>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Get emails for niche-specific content and community activity
                    </p>
                  </div>
                  <span
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                      form.emailNotifications ? accentStyles[ACCENT].solidBtn.split(" ")[0] : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        form.emailNotifications ? "left-4" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
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