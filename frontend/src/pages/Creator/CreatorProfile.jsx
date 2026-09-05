import { useState } from "react";
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

/*
  Backend wiring: SECTION_ENDPOINTS + buildPayload() are the only two
  things a backend integration needs to touch — same convention as the
  Brand profile. UI-only helper fields (nicheIsOther, interestsOtherActive,
  interestsOtherDraft) exist purely to drive the "Other" input and are
  intentionally left out of every payload.

  Confirmation flow: every action that could discard or persist unsaved
  work (switching tabs, cancelling, saving) routes through requestConfirm()
  so the user always gets an explicit yes/no before anything changes.
*/

const MOCK_USER = {
  photo: null,
  cover: null,
  firstName: "Aisha",
  lastName: "Khan",
  email: "aisha@example.com",
  role: "Creator",
  verified: true,
  dob: "1998-03-22",
  gender: "Female",

  niche: "Anime Reactions", // not in the preset NICHES list — a custom value saved via "Other" on a previous visit
  interests: ["Vlogging", "Shorts / Reels", "Live streaming"],
  handles: { youtube: "@aishaplays", instagram: "@aisha.gaming", facebook: "", twitter: "@aishaplays" },
  portfolioUrl: "https://aishaplays.com",

  bio: "Full-time gaming creator — daily uploads, weekly live streams, and the occasional questionable speedrun.",
  languages: ["English", "Hindi"],
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",

  contactNumber: "+91 90000 00000",
  paymentMethod: "upi",
  upiId: "aisha@upi",
  emailNotifications: true,

  stats: {
    gigsPosted: 6,
    clippersWorked: 41,
    opportunitiesCompleted: 14,
    totalEarned: "₹58,200",
  },
};

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

const VALIDATORS = {
  identity: (f) => {
    if (!f.firstName.trim()) return "First name is required.";
    if (!f.lastName.trim()) return "Last name is required.";
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
    if (!f.paymentMethod) return "Please select a payment method.";
    if (f.paymentMethod === "upi" && !f.upiId.trim()) return "UPI ID is required.";
    return null;
  },
};

const SECTION_ENDPOINTS = {
  identity: "/api/creator-profile/identity",
  channel: "/api/creator-profile/channel",
  about: "/api/creator-profile/about",
  payments: "/api/creator-profile/payments",
};

const buildPayload = (tabId, f) => {
  switch (tabId) {
    case "identity":
      return { firstName: f.firstName, lastName: f.lastName, dob: f.dob, gender: f.gender };
    case "channel":
      return {
        niche: f.niche,
        interests: f.interests,
        handles: f.handles,
        portfolioUrl: f.portfolioUrl,
      };
    case "about":
      return { bio: f.bio, languages: f.languages, city: f.city, state: f.state, country: f.country };
    case "payments":
      return {
        contactNumber: f.contactNumber,
        paymentMethod: f.paymentMethod,
        upiId: f.upiId,
        emailNotifications: f.emailNotifications,
      };
    default:
      return {};
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

export default function CreatorProfile() {
  const [tab, setTab] = useState("identity");
  const [form, setForm] = useState({
    ...MOCK_USER,
    // UI-only: was the saved niche a custom ("Other") value?
    nicheIsOther: !!MOCK_USER.niche && !NICHES.includes(MOCK_USER.niche),
    interestsOtherActive: false,
    interestsOtherDraft: "",
  });
  const [editingTabs, setEditingTabs] = useState({});
  const [snapshots, setSnapshots] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [confirmState, setConfirmState] = useState(null);

  const { showToast } = useToast();

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
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, [key]: reader.result }));
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
      // Persist to backend
      const refreshedProfile = await api('/api/auth/profile/me/', {
        method: 'PATCH',
        body: buildPayload(tabId, form),
      });

      const nowParam = Date.now();
      if (refreshedProfile?.avatar && typeof refreshedProfile.avatar === 'string') {
        refreshedProfile.avatar = `${refreshedProfile.avatar}${refreshedProfile.avatar.includes('?') ? '&' : '?'}v=${nowParam}`;
      }
      if (refreshedProfile?.cover && typeof refreshedProfile.cover === 'string') {
        refreshedProfile.cover = `${refreshedProfile.cover}${refreshedProfile.cover.includes('?') ? '&' : '?'}v=${nowParam}`;
      }

      setForm(buildInitialForm(refreshedProfile));
      setSaveStatus((s) => ({ ...s, [tabId]: 'saved' }));
      setEditingTabs((e) => ({ ...e, [tabId]: false }));
      showToast({ type: 'success', message: 'Changes saved.' });
      setTimeout(() => setSaveStatus((s) => ({ ...s, [tabId]: 'idle' })), 1800);
    } catch {
      setSaveStatus((s) => ({ ...s, [tabId]: "idle" }));
      showToast({
        type: "error",
        message: "Something went wrong saving your changes. Please try again.",
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
    { label: "Gigs Posted", value: form.stats.gigsPosted, icon: Megaphone, accent: "violet" },
    { label: "Clippers Worked With", value: form.stats.clippersWorked, icon: Users, accent: "cyan" },
    { label: "Opportunities Completed", value: form.stats.opportunitiesCompleted, icon: Briefcase, accent: "amber" },
    { label: "Total Earned", value: form.stats.totalEarned, icon: IndianRupee, accent: "emerald" },
  ];

  const customInterests = form.interests.filter((v) => !INTERESTS.includes(v));

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
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#0A0A0F] bg-[#11111A]">
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
                  <BadgeCheck size={19} className={accentStyles[ACCENT].iconText} title="Verified creator" />
                )}
              </div>
              <p className="text-sm text-zinc-400">{form.niche}</p>
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

          {tab === "channel" && (
            <div className="space-y-6">
              <EditControl isEditing={editingTabs.channel} onEdit={() => startEdit("channel")} />

              <div className={`space-y-6 ${!editingTabs.channel ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Primary niche" required hint="Pick one — or choose Other to enter your own">
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

                <Field label="Content interests" required hint="Select all that apply — or add your own">
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
                        label={`${custom} ✕`}
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
                  <SaveButton status={saveStatus.channel ?? "idle"} onClick={() => handleSaveClick("channel")} />
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
              <EditControl isEditing={editingTabs.payments} onEdit={() => startEdit("payments")} />

              <div className={`space-y-6 ${!editingTabs.payments ? "pointer-events-none opacity-60" : ""}`}>
                <Field label="Contact number" required hint="Mobile">
                  <Input
                    accent={ACCENT}
                    type="tel"
                    value={form.contactNumber}
                    onChange={set("contactNumber")}
                    disabled={!editingTabs.payments}
                  />
                </Field>

                <Field label="Payment method" required>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "upi", label: "UPI" },
                      { id: "debit", label: "Debit card" },
                      { id: "credit", label: "Credit card" },
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

                {(form.paymentMethod === "debit" || form.paymentMethod === "credit") && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
                    Card details are managed securely through our payment partner — we don't store card
                    numbers directly.
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