import { useState } from "react";
import {
  UserRound,
  BookOpen,
  Share2,
  Wallet,
  Check,
  Camera,
  Video,
  Users2,
  AtSign,
} from "lucide-react";
import {
  Field,
  Input,
  TextArea,
  ChipGroup,
  ImageUpload,
  accentStyles,
} from "../onboarding/Layout";

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

  MOCK_USER below stands in for whatever your real user/auth context
  provides — swap it for that when wiring this up.
*/

const MOCK_USER = {
  photo: null,
  cover: null,
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "Brand",
  dob: "1996-04-12",
  gender: "Male",
  bio: "Building campaigns that creators actually want to join.",
  languages: ["English", "Hindi"],
  city: "Jaipur",
  state: "Rajasthan",
  country: "India",
  handles: { instagram: "@acme", youtube: "", facebook: "", twitter: "@acme" },
  contactNumber: "+91 98765 43210",
  paymentMethod: "upi",
  upiId: "john@upi",
  emailNotifications: true,
};

const ACCENT = "cyan"; // derive from MOCK_USER.role in a real integration

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

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: Camera, placeholder: "@handle" },
  { key: "youtube", label: "YouTube", icon: Video, placeholder: "channel URL or @handle" },
  { key: "facebook", label: "Facebook", icon: Users2, placeholder: "page URL or @handle" },
  { key: "twitter", label: "X / Twitter", icon: AtSign, placeholder: "@handle" },
];

const TABS = [
  { id: "identity", label: "Identity", icon: UserRound },
  { id: "about", label: "About", icon: BookOpen },
  { id: "social", label: "Social", icon: Share2 },
  { id: "payments", label: "Contact & payments", icon: Wallet },
];
const totalSubmissions = submissions.length;
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

export default function Profile() {
  const [tab, setTab] = useState("identity");
  const [form, setForm] = useState(MOCK_USER);
  const [saveStatus, setSaveStatus] = useState({}); // { [tabId]: "idle" | "saving" | "saved" }

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

  const handleSave = (tabId) => {
    setSaveStatus((s) => ({ ...s, [tabId]: "saving" }));
    // Mock persistence — replace with a real API call.
    setTimeout(() => {
      setSaveStatus((s) => ({ ...s, [tabId]: "saved" }));
      setTimeout(() => setSaveStatus((s) => ({ ...s, [tabId]: "idle" })), 1800);
    }, 700);
  };

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-semibold text-white">
        Complete Your Profile
      </h3>

      <p className="mt-1 text-sm text-zinc-400">
        Complete your profile to unlock better campaign matches.
      </p>
    </div>

    <span className="text-violet-400 font-semibold">
      65%
    </span>
  </div>
</div>
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-white">Profile</h1>
        <span
          className={`rounded-full border border-white/10 px-3 py-1 text-xs font-medium ${accentStyles[ACCENT].iconBg} ${accentStyles[ACCENT].iconText}`}
        >
          {form.role}
        </span>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Tab nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition md:w-full ${
                tab === id
                  ? `${accentStyles[ACCENT].iconBg} ${accentStyles[ACCENT].iconText}`
                  : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          {tab === "identity" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <ImageUpload
                  label="Photo"
                  shape="circle"
                  value={form.photo}
                  onChange={(v) => setForm((f) => ({ ...f, photo: v }))}
                  accent={ACCENT}
                />
                <div className="flex-1">
                  <ImageUpload
                    label="Cover photo"
                    value={form.cover}
                    onChange={(v) => setForm((f) => ({ ...f, cover: v }))}
                    accent={ACCENT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="First name" required>
                  <Input accent={ACCENT} value={form.firstName} onChange={set("firstName")} />
                </Field>
                <Field label="Last name" required>
                  <Input accent={ACCENT} value={form.lastName} onChange={set("lastName")} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of birth" required>
                  <Input accent={ACCENT} type="date" value={form.dob} onChange={set("dob")} />
                </Field>
                <Field label="Gender" required>
                  <div className="flex flex-wrap gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, gender: g }))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          form.gender === g
                            ? `border-transparent ${accentStyles[ACCENT].solidBtn} text-[#0A0A0F]`
                            : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Email" hint="Contact support to change">
                <Input accent={ACCENT} value={form.email} disabled className="opacity-60" />
              </Field>

              <div className="flex justify-end border-t border-white/5 pt-5">
                <SaveButton status={saveStatus.identity ?? "idle"} onClick={() => handleSave("identity")} />
              </div>
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-6">
              <Field label="Bio" hint="Optional">
                <TextArea accent={ACCENT} rows={3} value={form.bio} onChange={set("bio")} />
              </Field>

              <Field label="Languages" required hint="Select all that apply">
                <ChipGroup options={LANGUAGES} selected={form.languages} onToggle={toggleLanguage} accent={ACCENT} />
              </Field>

              <Field label="Location" required>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Input accent={ACCENT} placeholder="City" value={form.city} onChange={set("city")} />
                  <Input accent={ACCENT} placeholder="State" value={form.state} onChange={set("state")} />
                  <Input
                    accent={ACCENT}
                    placeholder="Country"
                    value={form.country}
                    onChange={set("country")}
                    className="col-span-2 sm:col-span-1"
                  />
                </div>
              </Field>

              <div className="flex justify-end border-t border-white/5 pt-5">
                <SaveButton status={saveStatus.about ?? "idle"} onClick={() => handleSave("about")} />
              </div>
            </div>
          )}

          {tab === "social" && (
            <div className="space-y-6">
              <Field label="Platform handles" hint="Optional">
                <div className="space-y-3">
                  {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                        <Icon size={16} />
                      </div>
                      <Input
                        accent={ACCENT}
                        placeholder={`${label} ${placeholder}`}
                        value={form.handles[key]}
                        onChange={updateHandle(key)}
                      />
                    </div>
                  ))}
                </div>
              </Field>

              <div className="flex justify-end border-t border-white/5 pt-5">
                <SaveButton status={saveStatus.social ?? "idle"} onClick={() => handleSave("social")} />
              </div>
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-6">
              <Field label="Contact number" required hint="Mobile">
                <Input accent={ACCENT} type="tel" value={form.contactNumber} onChange={set("contactNumber")} />
              </Field>

              <Field label="Payout method" required>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "upi", label: "UPI" },
                    { id: "debit", label: "Debit card" },
                    { id: "credit", label: "Credit card" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, paymentMethod: method.id }))}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                        form.paymentMethod === method.id
                          ? `border-transparent ${accentStyles[ACCENT].solidBtn} text-[#0A0A0F]`
                          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </Field>

              {form.paymentMethod === "upi" && (
                <Field label="UPI ID" required>
                  <Input accent={ACCENT} value={form.upiId} onChange={set("upiId")} />
                </Field>
              )}

              {(form.paymentMethod === "debit" || form.paymentMethod === "credit") && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
                  Card details are managed securely through our payment partner —
                  we don't store card numbers directly.
                </div>
              )}

              <Field label="Email notifications">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emailNotifications: !f.emailNotifications }))}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/20"
                >
                  <span className="text-sm text-zinc-300">
                    Get emails for niche-specific content and community activity
                  </span>
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
              </Field>

              <div className="flex justify-end border-t border-white/5 pt-5">
                <SaveButton status={saveStatus.payments ?? "idle"} onClick={() => handleSave("payments")} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}