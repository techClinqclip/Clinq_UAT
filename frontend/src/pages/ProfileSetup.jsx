import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  UserRound,
  BookOpen,
  Share2,
  Wallet,
  Camera,
  Video,
  Users2,
  AtSign,
} from "lucide-react";
import OnboardingLayout, {
  Field,
  Input,
  TextArea,
  ChipGroup,
  ImageUpload,
  accentStyles,
} from "./layout";

/*
  Profile Setup — the "Common" fields from the spec, collected once after
  role-specific onboarding and before Dashboard:

  Photo, Cover photo, First name, Last name, Contact info (mobile),
  Bio, DOB, gender, Languages, Location (City/State/Country), social
  media handles, payment configuration (UPI/Debit/Credit card), email
  notification preference.

  Email itself isn't re-collected — already captured at Signup.

  Social handles are only asked here for role === "brand": Creator and
  Clipper already gave theirs during role-specific onboarding, so
  re-asking would be duplicate friction.

  Payment config intentionally does NOT collect raw card numbers in a
  plain input — that's a PCI-compliance problem for a form like this.
  UPI ID is fine to collect directly (lower-risk). Card details point
  to "added securely at payout time" instead of an input here.

  Role is read from ?role= the same way Signup/onboarding pages do —
  swap for real auth/user context when wiring this up for real.
*/

const roleAccent = { creator: "violet", clipper: "amber", brand: "cyan" };

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

const emptyForm = {
  photo: null,
  cover: null,
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  bio: "",
  languages: [],
  city: "",
  state: "",
  country: "",
  handles: { instagram: "", youtube: "", facebook: "", twitter: "" },
  contactNumber: "",
  paymentMethod: "",
  upiId: "",
  emailNotifications: true,
};



export default function ProfileSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "clipper";
  const ACCENT = roleAccent[role] || "violet";

  const includeSocialStep = role === "brand";
  const STEPS = includeSocialStep
    ? ["Identity", "About you", "Social handles", "Contact & payments"]
    : ["Identity", "About you", "Contact & payments"];

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);

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

  const goBack = () => {
    if (step === 0) navigate(-1);
    else setStep((s) => s - 1);
  };
  const goNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else navigate("/marketplace");
  };

  // step index -> logical section, accounting for the brand-only social step
  const section = includeSocialStep
    ? ["identity", "about", "social", "contact"][step]
    : ["identity", "about", "contact"][step];

  const stepCopy = {
    identity: {
      eyebrow: `Profile Setup · ${step + 1} of ${STEPS.length}`,
      title: "Let's put a face to the name",
      subtitle: "This is how you'll show up across Clinq.",
    },
    about: {
      eyebrow: `Profile Setup · ${step + 1} of ${STEPS.length}`,
      title: "Tell us a bit more about you",
      subtitle: "Helps us tailor content and connections to you.",
    },
    social: {
      eyebrow: `Profile Setup · ${step + 1} of ${STEPS.length}`,
      title: "Link your social profiles",
      subtitle: "Optional, but it helps creators and clippers recognize your brand.",
    },
    contact: {
      eyebrow: `Profile Setup · ${step + 1} of ${STEPS.length}`,
      title: "Contact & payments",
      subtitle: "How we reach you, and how you get paid.",
    },
  }[section];

  const isIdentityValid = form.firstName.trim() && form.lastName.trim() && form.dob && form.gender;
  const isAboutValid = form.languages.length > 0 && form.city.trim() && form.country.trim();
  const isSocialValid = true; // optional step
  const isContactValid =
    form.contactNumber.trim() &&
    form.paymentMethod &&
    (form.paymentMethod !== "upi" || form.upiId.trim());

  const validityBySection = { identity: isIdentityValid, about: isAboutValid, social: isSocialValid, contact: isContactValid };
  const primaryDisabled = !validityBySection[section];

  return (
    <OnboardingLayout
      accent={ACCENT}
      eyebrow={stepCopy.eyebrow}
      title={stepCopy.title}
      subtitle={stepCopy.subtitle}
      steps={STEPS}
      currentStep={step}
      onBack={goBack}
      primaryLabel={step === STEPS.length - 1 ? "Go to dashboard" : "Continue"}
      onPrimary={goNext}
      primaryDisabled={primaryDisabled}
      secondaryLabel={step > 0 ? "Previous" : undefined}
      onSecondary={step > 0 ? goBack : undefined}
    >
      {section === "identity" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-1">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
              <UserRound size={17} className={accentStyles[ACCENT].iconText} />
            </div>
            <p className="text-sm text-zinc-400">Identity</p>
          </div>

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
              <Input accent={ACCENT} placeholder="Jane" value={form.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Last name" required>
              <Input accent={ACCENT} placeholder="Doe" value={form.lastName} onChange={set("lastName")} />
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
        </div>
      )}

      {section === "about" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-1">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
              <BookOpen size={17} className={accentStyles[ACCENT].iconText} />
            </div>
            <p className="text-sm text-zinc-400">About you</p>
          </div>

          <Field label="Bio" hint="Optional">
            <TextArea accent={ACCENT} rows={3} placeholder="A short line about you" value={form.bio} onChange={set("bio")} />
          </Field>

          <Field label="Languages" required hint="Select all that apply">
            <ChipGroup options={LANGUAGES} selected={form.languages} onToggle={toggleLanguage} accent={ACCENT} />
          </Field>

          <Field label="Location" required>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Input accent={ACCENT} placeholder="City" value={form.city} onChange={set("city")} />
              <Input accent={ACCENT} placeholder="State" value={form.state} onChange={set("state")} />
              <Input accent={ACCENT} placeholder="Country" value={form.country} onChange={set("country")} className="col-span-2 sm:col-span-1" />
            </div>
          </Field>
        </div>
      )}

      {section === "social" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-1">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
              <Share2 size={17} className={accentStyles[ACCENT].iconText} />
            </div>
            <p className="text-sm text-zinc-400">Social handles</p>
          </div>

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
        </div>
      )}

      {section === "contact" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-1">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
              <Wallet size={17} className={accentStyles[ACCENT].iconText} />
            </div>
            <p className="text-sm text-zinc-400">Contact & payments</p>
          </div>

          <Field label="Contact number" required hint="Mobile">
            <Input accent={ACCENT} type="tel" placeholder="+1 555 000 0000" value={form.contactNumber} onChange={set("contactNumber")} />
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
              <Input accent={ACCENT} placeholder="yourname@upi" value={form.upiId} onChange={set("upiId")} />
            </Field>
          )}

          {(form.paymentMethod === "debit" || form.paymentMethod === "credit") && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
              Card details are added securely through our payment partner when you
              set up your first payout — we don't collect card numbers here.
            </div>
          )}

          <Field label="Email notifications">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, emailNotifications: !f.emailNotifications }))}
              className={`flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/20`}
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
        </div>
      )}
    </OnboardingLayout>
  );
}