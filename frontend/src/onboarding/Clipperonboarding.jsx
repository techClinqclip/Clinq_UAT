import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Wrench, Camera, Video, Music2, AtSign, Globe, UserRound, Check, X, Loader2 } from "lucide-react";

import { FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa6";
import OnboardingLayout, {
  Field,
  Input,
  ChipGroup,
  OtherOptionInput,
  accentStyles,
} from "./Layout";
import useToast from "../hooks/useToast";
import { api } from "../lib/api";
import ProcessingModal from "../shared/ui/ProcessingModal"; // adjust path to your shared UI folder
function XLogoIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.3l8.1-9.3L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
    </svg>
  );
}

const ACCENT = "amber";

const STEPS = ["Experience", "Tools & skills"];

const EXPERIENCE_LEVELS = ["New to clipping", "0–1 years", "1–3 years", "3+ years"];

const TOOLS = [
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "CapCut",
  "Final Cut Pro",
  "Photoshop",
  "Canva",
];

const SKILLS = [
  "Video editing",
  "Motion graphics",
  "Graphic designing",
  "Color grading",
  "Sound design",
  "Thumbnail design",
  "Scriptwriting",
];

const INTERESTS = [
  "Gaming",
  "Comedy",
  "Sports",
  "Music",
  "Tech",
  "Finance",
  "Lifestyle",
  "Education",
  "News & Politics",
  "Fashion",
];

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: FaInstagram, placeholder: "@handle" },
  { key: "youtube", label: "YouTube", icon: FaYoutube, placeholder: "channel URL or @handle" },
  { key: "tiktok", label: "TikTok", icon: FaTiktok, placeholder: "@handle" },
  { key: "twitter", label: "X / Twitter", icon: XLogoIcon, placeholder: "@handle" },
];

const emptyForm = {
  firstName: "",
  lastName: "",
  username: "",
  experience: "",
  handles: { instagram: "", youtube: "", tiktok: "", twitter: "" },
  portfolioUrl: "",
  tools: [],
  skills: [],
  interests: [],
};

const withCustomOptions = (options, selected) => [
  ...options,
  ...selected.filter((item) => !options.includes(item)),
];

const USERNAME_MIN_LENGTH = 6;
const USERNAME_REGEX = /^[A-Za-z0-9@#_]+$/;

function isValidUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return true; // optional field, empty is fine
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return /\.[a-z]{2,}$/i.test(url.hostname) && url.hostname.length > 3;
  } catch {
    return false;
  }
}

export default function ClipperOnboarding() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [customInputs, setCustomInputs] = useState({ tools: "", skills: "", interests: "" });
  const [openCustomField, setOpenCustomField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ProcessingModal state for the final save
  const [showProcessing, setShowProcessing] = useState(false);
  const [saveStepIndex, setSaveStepIndex] = useState(-1);
  const SAVE_STEPS = ["Saving your details", "Preparing your profile"];

  // idle | checking | available | taken — network/endpoint errors fall
  // back to "idle" so a flaky check never blocks someone from finishing
  // onboarding; a real conflict still gets caught at submit time.
  const [usernameStatus, setUsernameStatus] = useState("idle");

  useEffect(() => {
    const value = form.username.trim();
    if (value.length < USERNAME_MIN_LENGTH) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        // ADJUST to match your backend's actual username-availability
        // endpoint/response shape.
        const res = await api(`/api/auth/check-username/?username=${encodeURIComponent(value)}`);
        setUsernameStatus(res?.available === false ? "taken" : "available");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.username]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateHandle = (platform) => (e) =>
    setForm((f) => ({ ...f, handles: { ...f.handles, [platform]: e.target.value } }));

  const toggleFromList = (key) => (value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const addCustomValue = (key) => {
    const value = customInputs[key].trim();
    if (!value) return;

    setForm((f) => {
      const exists = f[key].some((item) => item.toLowerCase() === value.toLowerCase());
      return {
        ...f,
        [key]: exists ? f[key] : [...f[key], value],
      };
    });
    setCustomInputs((inputs) => ({ ...inputs, [key]: "" }));
    setOpenCustomField(null);
  };

  const goBack = () => {
    if (step === 0) navigate('/onboarding/role', { replace: true });
    else setStep((s) => s - 1);
  };

  const persistOnboarding = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    setShowProcessing(true);
    setSaveStepIndex(0);

    try {
      const payload = {
        role: 'clipper',
        type: 'clipper',
        user_type: 'clipper',
        first_name: form.firstName,
        last_name: form.lastName,
        username: form.username,
        experience_level: form.experience,
        handles: form.handles,
        portfolio_url: form.portfolioUrl,
        editing_tools: form.tools,
        skills: form.skills,
        onboarding_data: {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          experienceLevel: form.experience,
          handles: form.handles,
          portfolioUrl: form.portfolioUrl,
          editingTools: form.tools,
          skills: form.skills,
          categories: form.interests,
          interests: form.interests,
        },
      };

      await api('/api/auth/profile/me/', {
        method: 'PATCH',
        body: payload,
      });

      // Clear auth cache to force fresh profile fetch
      localStorage.setItem('user_type', 'clipper');
      // Force a small delay to ensure backend processes the request
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveStepIndex(SAVE_STEPS.length); // marks done -> ProcessingModal fires onComplete
    } catch (err) {
      console.error('Clipper onboarding submit failed', err);
      setShowProcessing(false);
      setError(err.message || 'Unable to save your onboarding details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === 0 && form.portfolioUrl.trim() && !isValidUrl(form.portfolioUrl)) {
      showToast({ type: "error", message: "Enter a valid portfolio URL, e.g. https://your-portfolio.com" });
      return;
    }
  
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      persistOnboarding();
    }
  };
  const stepCopy = [
    {
      eyebrow: "Clipper Setup · 1 of 2",
      title: "Tell us about yourself",
      subtitle: "This helps us match you with the right campaigns.",
    },
    {
      eyebrow: "Clipper Setup · 2 of 2",
      title: "What do you work with?",
      subtitle: "Pick everything that applies — you can change this later.",
    },
  ][step];

  const atLeastOneHandle = Object.values(form.handles).some((v) => v.trim());
  const isIdentityValid =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.username.trim().length >= USERNAME_MIN_LENGTH &&
    usernameStatus !== "taken" &&
    usernameStatus !== "checking";
  const isStep0Valid = isIdentityValid && Boolean(form.experience) && atLeastOneHandle;
  const isStep1Valid = form.tools.length > 0 && form.skills.length > 0 && form.interests.length > 0;

  const primaryDisabled = ![isStep0Valid, isStep1Valid][step] || isSubmitting;

  return (
    <>
      <OnboardingLayout
        accent={ACCENT}
        eyebrow={stepCopy.eyebrow}
        title={stepCopy.title}
        subtitle={stepCopy.subtitle}
        steps={STEPS}
        currentStep={step}
        onBack={goBack}
        primaryLabel={step === STEPS.length - 1 ? (isSubmitting ? "Saving..." : "Finish setup") : "Continue"}
        onPrimary={goNext}
        primaryDisabled={primaryDisabled}
        secondaryLabel={step > 0 ? "Previous" : undefined}
        onSecondary={step > 0 ? goBack : undefined}
      >
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
                <UserRound size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Identity</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" required>
                <Input accent={ACCENT} value={form.firstName} onChange={set("firstName")} />
              </Field>
              <Field label="Last name" required>
                <Input accent={ACCENT} value={form.lastName} onChange={set("lastName")} />
              </Field>
            </div>

            <Field label="Username" required hint={`At least ${USERNAME_MIN_LENGTH} characters — how brands will find you`}>
            <Input
  accent={ACCENT}
  value={form.username}
  onChange={(e) => {
    const sanitized = e.target.value.replace(/[^A-Za-z0-9@#_]/g, "");
    setForm((f) => ({ ...f, username: sanitized }));
  }}
                placeholder="yourclippername"
              />
         {form.username.trim().length > 0 && form.username.trim().length < USERNAME_MIN_LENGTH && (
  <p className="mt-2 text-xs text-zinc-500">
    Needs {USERNAME_MIN_LENGTH}+ characters, using only letters, numbers, @, #, or _.
  </p>
)}
              {usernameStatus === "checking" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Loader2 size={12} className="animate-spin" />
                  Checking availability…
                </p>
              )}
              {usernameStatus === "available" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check size={12} />
                  Username is available.
                </p>
              )}
              {usernameStatus === "taken" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                  <X size={12} />
                  That username is already taken.
                </p>
              )}
            </Field>

            <div className="flex items-center gap-3 pb-1 pt-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
                <Sparkles size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Experience</p>
            </div>

            <Field label="Experience level" required>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, experience: level }))}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                      form.experience === level
                        ? "border-transparent bg-amber-500 text-[#0A0A0F] hover:bg-amber-400"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Social media handles" required hint="At least one">
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

            <Field label="Portfolio link" hint="Optional">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                  <Globe size={16} />
                </div>
                <Input
                  accent={ACCENT}
                  type="url"
                  placeholder="https://your-portfolio.com"
                  value={form.portfolioUrl}
                  onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
                />
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
                <Wrench size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Tools & skills</p>
            </div>

            <Field label="Editing tools" required hint="Select all that apply">
              <div className="flex flex-wrap gap-2">
                <ChipGroup
                  options={withCustomOptions(TOOLS, form.tools)}
                  selected={form.tools}
                  onToggle={toggleFromList("tools")}
                  accent={ACCENT}
                  className="contents"
                />
                <OtherOptionInput
                  accent={ACCENT}
                  open={openCustomField === "tools"}
                  value={customInputs.tools}
                  onOpen={() => setOpenCustomField("tools")}
                  onChange={(e) => setCustomInputs((inputs) => ({ ...inputs, tools: e.target.value }))}
                  onAdd={() => addCustomValue("tools")}
                  placeholder="Add a tool"
                />
              </div>
            </Field>

            <Field label="Skills" required hint="Select all that apply">
              <div className="flex flex-wrap gap-2">
                <ChipGroup
                  options={withCustomOptions(SKILLS, form.skills)}
                  selected={form.skills}
                  onToggle={toggleFromList("skills")}
                  accent={ACCENT}
                  className="contents"
                />
                <OtherOptionInput
                  accent={ACCENT}
                  open={openCustomField === "skills"}
                  value={customInputs.skills}
                  onOpen={() => setOpenCustomField("skills")}
                  onChange={(e) => setCustomInputs((inputs) => ({ ...inputs, skills: e.target.value }))}
                  onAdd={() => addCustomValue("skills")}
                  placeholder="Add a skill"
                />
              </div>
            </Field>

            <Field label="Interests / category" required hint="Select all that apply">
              <div className="flex flex-wrap gap-2">
                <ChipGroup
                  options={withCustomOptions(INTERESTS, form.interests)}
                  selected={form.interests}
                  onToggle={toggleFromList("interests")}
                  accent={ACCENT}
                  className="contents"
                />
                <OtherOptionInput
                  accent={ACCENT}
                  open={openCustomField === "interests"}
                  value={customInputs.interests}
                  onOpen={() => setOpenCustomField("interests")}
                  onChange={(e) => setCustomInputs((inputs) => ({ ...inputs, interests: e.target.value }))}
                  onAdd={() => addCustomValue("interests")}
                  placeholder="Add an interest"
                />
              </div>
            </Field>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </OnboardingLayout>

      <ProcessingModal
        isOpen={showProcessing}
        mode="controlled"
        title="Setting up your profile"
        steps={SAVE_STEPS}
        currentStepIndex={saveStepIndex}
        onComplete={() => navigate('/marketplace')}
      />
    </>
  );
}
