import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, UserRound, Mail, CheckCircle2, ChevronDown, Check ,  Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OnboardingLayout, { Field, Input, TextArea, accentStyles } from "./layout";
import { api } from "../lib/api";
import { getStoredUserEmail } from "../lib/auth";
import useToast from "../hooks/useToast";
import ProcessingModal from "../shared/ui/ProcessingModal"; // adjust path to your shared UI folder
const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "aol.com",
];
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const FIELD_LABELS = {
  manager_email: "Contact email",
  manager_contact: "Contact number",
  company_email: "Company email",
  website_url: "Website URL",
  username: "Username",
  company_name: "Company name",
  brand_name: "Brand name",
};

function friendlyErrorMessage(raw) {
  if (!raw) return "Unable to save your onboarding details.";
  const match = raw.match(/^(\w+):\s*(.+)$/);
  if (match && FIELD_LABELS[match[1]]) {
    return `${FIELD_LABELS[match[1]]}: ${match[2]}`;
  }
  return raw;
}
function isCompanyEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return Boolean(domain) && !PERSONAL_EMAIL_DOMAINS.includes(domain);
}

// Basic but forgiving URL check — accepts input with or without a scheme
// (e.g. "acme.com" or "https://acme.com") and just requires something
// that looks like a real hostname with a TLD. Empty is valid since this
// field is optional.
function isValidUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return /\.[a-z]{2,}$/i.test(url.hostname) && url.hostname.length > 3;
  } catch {
    return false;
  }
}

// Username rule: 6+ chars, letters/numbers plus @ # _ only. No spaces,
// no arithmetic symbols. Sanitized on keystroke in the input handler
// below, so this is mostly a length/emptiness guard by the time it runs.
const USERNAME_REGEX = /^[A-Za-z0-9@#_]+$/;
function isValidUsername(value) {
  const trimmed = value.trim();
  return trimmed.length >= 6 && USERNAME_REGEX.test(trimmed);
}

// Same country-code list used on the Profile settings page — keep these
// in sync if you add/remove a country in one place.
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

const STEPS = ["Company", "Manager", "Company email"];
const ACCENT = "cyan";

const emptyForm = {
  companyName: "",
  brandName: "",
  username: "",
  websiteUrl: "",
  description: "",
  managerFirstName: "",
  managerLastName: "",
  managerRole: "",
  managerContactCode: DEFAULT_COUNTRY_CODE,
  managerContactNumber: "",
  managerEmail: "",
  managerDob: "",
  companyEmail: "",
};

// Same dropdown pattern used on the Profile settings page — duplicated
// here rather than imported since onboarding/layout.jsx doesn't export
// it yet. Worth extracting to a shared location if you need it in a
// third place.
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
        <span className={`truncate ${selected ? "text-white" : "text-zinc-500"}`}>
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

export default function BrandOnboarding() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | checking | available | taken

useEffect(() => {
  const value = form.username.trim();
  if (!isValidUsername(value)) {
    setUsernameStatus("idle");
    return;
  }

  setUsernameStatus("checking");
  const timeout = setTimeout(async () => {
    try {
      // ADJUST to match your backend's actual username-availability endpoint.
      const res = await api(`/api/auth/check-username/?username=${encodeURIComponent(value)}`);
      setUsernameStatus(res?.available === false ? "taken" : "available");
    } catch {
      setUsernameStatus("idle");
    }
  }, 500);

  return () => clearTimeout(timeout);
}, [form.username]);

  const [showProcessing, setShowProcessing] = useState(false);
  const [saveStepIndex, setSaveStepIndex] = useState(-1);
  const SAVE_STEPS = ["Saving your details", "Preparing your dashboard"];

  const signupEmail = getStoredUserEmail();
  const signupIsCompanyEmail = Boolean(signupEmail) && isCompanyEmail(signupEmail);

  // Company-email verification state — only relevant when the user
  // signed up with a personal email and has to add + verify a company
  // one here in step 3.
  const [companyEmailOtp, setCompanyEmailOtp] = useState("");
  const [companyEmailOtpSent, setCompanyEmailOtpSent] = useState(false);
  const [companyEmailVerified, setCompanyEmailVerified] = useState(false);
  const [isSendingCompanyOtp, setIsSendingCompanyOtp] = useState(false);
  const [isVerifyingCompanyOtp, setIsVerifyingCompanyOtp] = useState(false);
  const [companyOtpError, setCompanyOtpError] = useState("");
  const [companyOtpCooldown, setCompanyOtpCooldown] = useState(0);

  useEffect(() => {
    if (companyOtpCooldown <= 0) return;
    const id = setInterval(() => setCompanyOtpCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [companyOtpCooldown]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const goBack = () => {
    if (step === 0) navigate('/onboarding/role', { replace: true });
    else setStep((s) => s - 1);
  };

  const handleSendCompanyOtp = async () => {
    if (!isCompanyEmail(form.companyEmail)) {
      showToast({ type: "error", message: "Enter a valid company email first." });
      return;
    }
    setIsSendingCompanyOtp(true);
    setCompanyOtpError("");
    try {
      await api('/api/auth/otp/send/', {
        method: 'POST',
        body: { email: form.companyEmail },
      });
      setCompanyEmailOtpSent(true);
      setCompanyOtpCooldown(30);
      showToast({ type: "success", message: `We sent a code to ${form.companyEmail}.` });
    } catch (err) {
      showToast({ type: "error", message: err.message || "Unable to send code." });
    } finally {
      setIsSendingCompanyOtp(false);
    }
  };

  const handleVerifyCompanyOtp = async () => {
    if (companyEmailOtp.length < 6) {
      setCompanyOtpError("Enter the full 6-digit code.");
      return;
    }
    setIsVerifyingCompanyOtp(true);
    setCompanyOtpError("");
    try {
      await api('/api/auth/otp/verify/', {
        method: 'POST',
        body: { email: form.companyEmail, otp: companyEmailOtp },
      });
      setCompanyEmailVerified(true);
      showToast({ type: "success", message: "Company email verified." });
    } catch (err) {
      setCompanyOtpError(err.message || "Incorrect code. Please try again.");
    } finally {
      setIsVerifyingCompanyOtp(false);
    }
  };

  const persistOnboarding = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowProcessing(true);
    setSaveStepIndex(0);

    // Space-separated on purpose — without it, the code+number can't be
    // unambiguously split back apart when the profile page reloads it
    // (e.g. "+919876543210" could misparse as code "+9198").
    const combinedContact = `${form.managerContactCode} ${form.managerContactNumber}`;

    try {
      await api('/api/auth/profile/me/', {
        method: 'PATCH',
        body: {
          role: 'brand',
          type: 'brand',
          user_type: 'brand',
          company_name: form.companyName,
          brand_name: form.brandName,
          username: form.username,
          website_url: form.websiteUrl,
          company_description: form.description,
          manager_first_name: form.managerFirstName,
          manager_last_name: form.managerLastName,
          manager_role: form.managerRole,
          manager_contact: combinedContact,
          manager_email: form.managerEmail,
          manager_dob: form.managerDob || null,
          company_email: signupIsCompanyEmail ? signupEmail : form.companyEmail,
          onboarding_data: {
            companyName: form.companyName,
            brandName: form.brandName,
            username: form.username,
            websiteUrl: form.websiteUrl,
            description: form.description,
            managerFirstName: form.managerFirstName,
            managerLastName: form.managerLastName,
            managerRole: form.managerRole,
            managerContact: combinedContact,
            managerEmail: form.managerEmail,
            managerDob: form.managerDob,
            companyEmail: signupIsCompanyEmail ? signupEmail : form.companyEmail,
          },
        },
      });
      // Force a small delay to ensure backend processes the request
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveStepIndex(SAVE_STEPS.length);
    } catch (err) {
      setShowProcessing(false);
      showToast({ type: "error", message: friendlyErrorMessage(err.message) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === 0 && form.websiteUrl.trim() && !isValidUrl(form.websiteUrl)) {
      showToast({ type: "error", message: "Enter a valid website URL, e.g. https://acme.com" });
      return;
    }
  
    if (step === 1 && form.managerEmail.trim() && !isValidEmail(form.managerEmail)) {
      showToast({ type: "error", message: "Enter a valid contact email, or leave it blank." });
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
      eyebrow: "Brand Setup · 1 of 3",
      title: "Tell us about your company",
      subtitle: "This is what creators and clippers will see on your campaigns.",
    },
    {
      eyebrow: "Brand Setup · 2 of 3",
      title: "Who's the point of contact?",
      subtitle: "We'll reach out to your manager for campaign approvals and billing.",
    },
    {
      eyebrow: "Brand Setup · 3 of 3",
      title: "Verify your company email",
      subtitle: "Required before you can access your dashboard.",
    },
  ][step];
  const isStep0Valid =
  form.companyName.trim() &&
  form.brandName.trim() &&
  isValidUsername(form.username) &&
  usernameStatus !== "taken" &&
  usernameStatus !== "checking";

  const contactDigitsExpected = COUNTRY_CODES.find((c) => c.code === form.managerContactCode)?.digits;
  const isContactValid =
    form.managerContactNumber.trim().length > 0 &&
    /^\d+$/.test(form.managerContactNumber.trim()) &&
    (!contactDigitsExpected || form.managerContactNumber.trim().length === contactDigitsExpected);

  const isStep1Valid =
    form.managerFirstName.trim() &&
    form.managerLastName.trim() &&
    form.managerRole.trim() &&
    isContactValid;

  // Company-email signups just confirm and move on. Personal-email
  // signups must supply a company email AND verify it via OTP before
  // they can finish setup.
  const isStep2Valid = signupIsCompanyEmail || (isCompanyEmail(form.companyEmail) && companyEmailVerified);

  const primaryDisabled = [isStep0Valid, isStep1Valid, isStep2Valid][step] ? false : true;

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
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
                <Building2 size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Company details</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
  <Field label="Company name" required>
    <Input accent={ACCENT} placeholder="Acme Inc." value={form.companyName} onChange={update("companyName")} />
  </Field>

  <Field label="Brand name" required hint="Public-facing name">
    <Input accent={ACCENT} placeholder="Acme" value={form.brandName} onChange={update("brandName")} />
  </Field>
</div>

<Field label="Username" required hint="Min. 6 characters — letters, numbers, @, #, _ only. No spaces.">
  <Input
    accent={ACCENT}
    placeholder="acme_official"
    value={form.username}
    onChange={(e) => {
      const sanitized = e.target.value.replace(/[^A-Za-z0-9@#_]/g, "");
      setForm((f) => ({ ...f, username: sanitized }));
    }}
  />
  {form.username.trim() && !isValidUsername(form.username) && (
    <p className="mt-2 text-xs text-zinc-500">Needs 6+ characters, using only letters, numbers, @, #, or _.</p>
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

            <Field label="Website URL" hint="Optional">
              <Input
                accent={ACCENT}
                type="url"
                placeholder="https://acme.com"
                value={form.websiteUrl}
                onChange={update("websiteUrl")}
              />
            </Field>

            <Field label="Description" hint="Optional">
              <TextArea
                accent={ACCENT}
                rows={4}
                placeholder="What does your brand do, and what kind of content are you looking for?"
                value={form.description}
                onChange={update("description")}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
                <UserRound size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Manager details</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" required>
                <Input accent={ACCENT} placeholder="Jane" value={form.managerFirstName} onChange={update("managerFirstName")} />
              </Field>
              <Field label="Last name" required>
                <Input accent={ACCENT} placeholder="Doe" value={form.managerLastName} onChange={update("managerLastName")} />
              </Field>
            </div>

            <Field label="Post in company" required hint="e.g. Marketing Lead">
              <Input accent={ACCENT} placeholder="Marketing Lead" value={form.managerRole} onChange={update("managerRole")} />
            </Field>

            <Field label="Contact number" required hint="Select a country code, then digits only">
              <div className="flex gap-2">
                <div className="w-36 shrink-0">
                  <NiceSelect
                    value={form.managerContactCode}
                    onChange={(v) => setForm((f) => ({ ...f, managerContactCode: v }))}
                    options={COUNTRY_CODES.map((c) => ({ value: c.code, label: `${c.code} ${c.country}` }))}
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
                />
              </div>
              {form.managerContactNumber.trim() &&
                contactDigitsExpected &&
                form.managerContactNumber.trim().length !== contactDigitsExpected && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Enter a valid {form.managerContactCode} number ({contactDigitsExpected} digits).
                  </p>
                )}
            </Field>

            <Field label="Manager DOB" hint="Optional">
              <Input accent={ACCENT} type="date" value={form.managerDob} onChange={update("managerDob")} />
            </Field>

            <Field label="Contact email" hint="Optional">
              <Input
                accent={ACCENT}
                type="email"
                placeholder="jane@acme.com"
                value={form.managerEmail}
                onChange={update("managerEmail")}
              />
            </Field>
          </div>
        )}


        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles[ACCENT].iconBg}`}>
                <Mail size={17} className={accentStyles[ACCENT].iconText} />
              </div>
              <p className="text-sm text-zinc-400">Company email</p>
            </div>

            {signupIsCompanyEmail ? (
              <div className="flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-4">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-white">{signupEmail} looks like a company email</p>
                  <p className="mt-1 text-xs text-zinc-400">Good to proceed — no further verification needed right now.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                  <p className="text-sm text-zinc-300">
                    You signed up with{" "}
                    <span className="font-medium text-white">{signupEmail || "your signup email"}</span>, which
                    looks like a personal email.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    You'll need to add and verify a company email before you can access your dashboard.
                  </p>
                </div>

                <Field label="Company email" required>
                  <Input
                    accent={ACCENT}
                    type="email"
                    placeholder="you@company.com"
                    value={form.companyEmail}
                    disabled={companyEmailVerified}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, companyEmail: e.target.value }));
                      // Editing the address after it's been verified (or
                      // after a code was sent) invalidates that state —
                      // a stale "verified" flag shouldn't survive a change.
                      setCompanyEmailVerified(false);
                      setCompanyEmailOtpSent(false);
                      setCompanyEmailOtp("");
                      setCompanyOtpError("");
                    }}
                  />
                </Field>

                {!companyEmailVerified && (
                  <button
                    type="button"
                    onClick={handleSendCompanyOtp}
                    disabled={!isCompanyEmail(form.companyEmail) || isSendingCompanyOtp || companyOtpCooldown > 0}
                    className="text-sm font-medium text-cyan-400 transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSendingCompanyOtp
                      ? "Sending…"
                      : companyOtpCooldown > 0
                      ? `Resend in ${companyOtpCooldown}s`
                      : companyEmailOtpSent
                      ? "Resend code"
                      : "Send verification code"}
                  </button>
                )}

                {companyEmailOtpSent && !companyEmailVerified && (
                  <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-xs text-zinc-400">Enter the 6-digit code sent to {form.companyEmail}</p>
                    <div className="flex gap-2">
                      <Input
                        accent={ACCENT}
                        inputMode="numeric"
                        placeholder="123456"
                        value={companyEmailOtp}
                        onChange={(e) => {
                          setCompanyEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setCompanyOtpError("");
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCompanyOtp}
                        disabled={isVerifyingCompanyOtp || companyEmailOtp.length < 6}
                        className="shrink-0 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-[#0A0A0F] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isVerifyingCompanyOtp ? "Verifying…" : "Verify"}
                      </button>
                    </div>
                    {companyOtpError && <p className="text-xs text-rose-400">{companyOtpError}</p>}
                  </div>
                )}

                {companyEmailVerified && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 size={14} />
                    Company email verified
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </OnboardingLayout>

      <ProcessingModal
        isOpen={showProcessing}
        mode="controlled"
        title="Setting up your brand"
        steps={SAVE_STEPS}
        currentStepIndex={saveStepIndex}
        onComplete={() => navigate('/brand/dashboard')}
      />
    </>
  );
}