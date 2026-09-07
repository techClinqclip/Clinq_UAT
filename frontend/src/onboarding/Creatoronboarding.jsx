import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaInstagram, FaYoutube, FaFacebook } from "react-icons/fa";
import useToast from "../hooks/useToast";
import { Flame, Share2, Video, Camera, Users2, AtSign, Globe, UserRound, Check, X, Loader2 } from "lucide-react";
import OnboardingLayout, {
  Field,
  Input,
  ChipGroup,
  OtherOptionInput,
  accentStyles,
} from "./Layout";
import { api } from "../lib/api";
import ProcessingModal from "../shared/ui/ProcessingModal"; // adjust path to your shared UI folder
function XLogoIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.3l8.1-9.3L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
    </svg>
  );
}
const ACCENT = "violet";
const STEPS = ["Niche & interests", "Platforms"];
const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: FaInstagram, placeholder: "@handle" },
  { key: "youtube", label: "YouTube", icon: FaYoutube, placeholder: "channel URL or @handle" },
  { key: "twitter", label: "X", icon: XLogoIcon, placeholder: "@handle" },
  { key: "facebook", label: "Facebook", icon: FaFacebook, placeholder: "profile or page URL" },
];
const NICHES = [
  "Gaming",
  "Beauty & fashion",
  "Tech",
  "Finance",
  "Comedy",
  "Music",
  "Food & cooking",
  "Fitness & health",
  "Travel",
  "Education",
  "Lifestyle",
  "Parenting",
];

const INTERESTS = [
  "Vlogging",
  "Tutorials",
  "Reviews",
  "Storytelling",
  "Live streaming",
  "Shorts / Reels",
  "Podcasts",
  "Collabs",
];

const PLATFORMS = [
  { key: "youtube", label: "YouTube", icon: FaYoutube, placeholder: "channel URL or @handle" },
  { key: "instagram", label: "Instagram", icon: FaInstagram, placeholder: "@handle" },
  { key: "facebook", label: "Facebook", icon: FaFacebook, placeholder: "page URL or @handle" },
  { key: "twitter", label: "X / Twitter", icon: XLogoIcon, placeholder: "@handle" },
];

const emptyForm = {
  firstName: "",
  lastName: "",
  username: "",
  niche: "",
  interests: [],
  handles: { youtube: "", instagram: "", facebook: "", twitter: "" },
  portfolioUrl: "",
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

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [customInputs, setCustomInputs] = useState({ niche: "", interests: "" });
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

  const toggleInterest = (value) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value)
        ? f.interests.filter((v) => v !== value)
        : [...f.interests, value],
    }));

  const addCustomNiche = () => {
    const niche = customInputs.niche.trim();
    if (!niche) return;

    setForm((f) => ({ ...f, niche }));
    setCustomInputs((inputs) => ({ ...inputs, niche: "" }));
    setOpenCustomField(null);
  };

  const addCustomInterest = () => {
    const interest = customInputs.interests.trim();
    if (!interest) return;

    setForm((f) => {
      const exists = f.interests.some((item) => item.toLowerCase() === interest.toLowerCase());
      return {
        ...f,
        interests: exists ? f.interests : [...f.interests, interest],
      };
    });
    setCustomInputs((inputs) => ({ ...inputs, interests: "" }));
    setOpenCustomField(null);
  };

  const updateHandle = (platform) => (e) =>
    setForm((f) => ({ ...f, handles: { ...f.handles, [platform]: e.target.value } }));

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
        role: 'creator',
        type: 'creator',
        user_type: 'creator',
        first_name: form.firstName,
        last_name: form.lastName,
        username: form.username,
        primary_niche: form.niche,
        content_interests: form.interests,
        handles: form.handles,
        portfolio_url: form.portfolioUrl,
        onboarding_data: {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          niche: form.niche,
          interests: form.interests,
          handles: form.handles,
          portfolioUrl: form.portfolioUrl,
        },
      };

      await api('/api/auth/profile/me/', {
        method: 'PATCH',
        body: payload,
      });

      localStorage.setItem('user_type', 'creator');
      // Force a small delay to ensure backend processes the request\n      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveStepIndex(SAVE_STEPS.length); // marks done -> ProcessingModal fires onComplete
    } catch (err) {
      console.error('Creator onboarding submit failed', err);
      setShowProcessing(false);
      setError(err.message || 'Unable to save your onboarding details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const goNext = () => {
    if (step === 1 && form.portfolioUrl.trim() && !isValidUrl(form.portfolioUrl)) {
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
      eyebrow: "Creator Setup · 1 of 2",
      title: "Tell us about yourself",
      subtitle: "This helps clippers and brands find the right fit for their campaigns.",
    },
    {
      eyebrow: "Creator Setup · 2 of 2",
      title: "Where do you publish?",
      subtitle: "Link your platforms so campaigns can find your audience.",
    },
  ][step];

  const isIdentityValid =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.username.trim().length >= USERNAME_MIN_LENGTH &&
    usernameStatus !== "taken" &&
    usernameStatus !== "checking";
    const isStep0Valid = isIdentityValid && Boolean(form.niche) && form.interests.length > 0;

    const atLeastOneHandle = Object.values(form.handles).some((v) => v.trim());
    const isStep1Valid = atLeastOneHandle;

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

            <Field label="Username" required hint={`At least ${USERNAME_MIN_LENGTH} characters — shown on your public profile`}>
              <Input
                accent={ACCENT}
                value={form.username}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^A-Za-z0-9@#_]/g, "");
                  setForm((f) => ({ ...f, username: sanitized }));
                }}
                placeholder="yourcreatorname"
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
                <Flame size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Niche & interests</p>
            </div>

            <Field label="Primary niche" required hint="Pick one">
              <div className="flex flex-wrap gap-2">
                {NICHES.map((niche) => (
                  <button
                    key={niche}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, niche }));
                      setOpenCustomField(null);
                    }}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${form.niche === niche
                        ? "border-transparent bg-violet-500 text-[#0A0A0F] hover:bg-violet-400"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}
                  >
                    {niche}
                  </button>
                ))}
                <OtherOptionInput
                  accent={ACCENT}
                  open={openCustomField === "niche"}
                  active={Boolean(form.niche) && !NICHES.includes(form.niche)}
                  value={customInputs.niche}
                  label={Boolean(form.niche) && !NICHES.includes(form.niche) ? form.niche : "Other"}
                  onOpen={() => setOpenCustomField("niche")}
                  onChange={(e) => setCustomInputs((inputs) => ({ ...inputs, niche: e.target.value }))}
                  onAdd={addCustomNiche}
                  placeholder="Add a niche"
                />
              </div>
            </Field>

            <Field label="Content interests" required hint="Select all that apply">
              <div className="flex flex-wrap gap-2">
                <ChipGroup
                  options={withCustomOptions(INTERESTS, form.interests)}
                  selected={form.interests}
                  onToggle={toggleInterest}
                  accent={ACCENT}
                  className="contents"
                />
                <OtherOptionInput
                  accent={ACCENT}
                  open={openCustomField === "interests"}
                  value={customInputs.interests}
                  onOpen={() => setOpenCustomField("interests")}
                  onChange={(e) => setCustomInputs((inputs) => ({ ...inputs, interests: e.target.value }))}
                  onAdd={addCustomInterest}
                  placeholder="Add an interest"
                />
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
                <Share2 size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Platforms</p>
            </div>

            <Field label="Platform handles" required hint="At least one">
              <div className="space-y-3">
                {PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
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
