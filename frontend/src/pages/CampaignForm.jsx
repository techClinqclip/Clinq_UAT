import { useEffect, useState } from "react";
import { Plus, Trash2, ImagePlus, Check, Download } from "lucide-react";
import { FaYoutube, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import DatePicker from "./DatePicker";
import useToast from "../hooks/useToast"; // adjust path to match this file's actual location
import ProcessingModal from "../shared/ui/ProcessingModal"; // adjust path to match this file's actual location
import { api } from "../lib/api";
import { downloadResourceSampleTemplate } from "../lib/resourceTemplate";

/*
  CampaignForm — shared by CreateCampaign and EditCampaign so the two
  don't drift into two slightly-different forms over time. Same fields,
  same validation; only the initial values, submit label, and what
  onSubmit does (POST vs PATCH) differ between the two callers.

  Props:
    initialData  — partial form shape to pre-fill (Edit passes the
                   existing campaign; Create leaves this undefined)
    mode         — "create" | "edit", just drives copy/submit label
    onSubmit(formData) — called with the full form state on submit.
                   MUST return a Promise that rejects on failure (and
                   resolves on success). Should NOT navigate/redirect
                   itself — do that in onSuccess instead, see below.
    onSuccess()  — called once the "done" checkmark animation has
                   actually finished playing. Navigation belongs here,
                   not inside onSubmit — if the page navigates away the
                   instant onSubmit resolves, the processing modal gets
                   unmounted mid-animation and never visibly completes.

  Validation UX: the submit button is intentionally NEVER disabled.
  Clicking it always runs validateCampaignForm() — any missing/invalid
  field shows an inline red message under that field AND a toast
  naming the first problem, so the person always knows exactly what's
  wrong instead of staring at a greyed-out button with no explanation.
*/

const CATEGORIES = [
  "Entertainment",
  "Gaming",
  "Finance",
  "Technology",
  "Podcast",
  "Fitness",
  "Education",
  "Lifestyle",
  "Sports",
];

const PLATFORMS = [
  { name: "YouTube", icon: FaYoutube },
  { name: "Instagram", icon: FaInstagram },
  { name: "Facebook", icon: FaFacebook },
  { name: "X", icon: FaXTwitter },
];

const ORIENTATIONS = [
  { value: "vertical", label: "Vertical (9:16)", hint: "Reels, Shorts, TikTok" },
  { value: "horizontal", label: "Horizontal (16:9)", hint: "YouTube, landscape" },
  { value: "square", label: "Square (1:1)", hint: "Feed posts" },
];

// Common format requirements a brand might want to hand clippers/creators
// as a checklist — kept generic since needs vary a lot campaign to campaign.
const CONTENT_REQUIREMENTS = [
  "Captions/subtitles required",
  "Hook within first 3 seconds",
  "Clear call-to-action",
  "Brand logo/watermark visible",
  "Original audio only (no licensed music)",
  "No text overlays covering the subject",
];

const emptyForm = {
  name: "",
  category: CATEGORIES[0],
  thumbnail: null,
  description: "",
  clipperRequirements: "",
  budget: "",
  rewardPer1k: "",
  maxEarnings: "",
  platforms: [],
  resources: [],
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  // Content template — gives clippers/creators concrete direction on the
  // format brands expect, instead of relying only on freeform requirements
  // text. All optional/soft-guidance unless you want these enforced.
  contentOrientations: [],
  minDurationSeconds: "",
  maxDurationSeconds: "",
  contentRequirements: [],
  exampleUrl: "",
};

function Section({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
      <h2 className="mb-6 text-xl font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm font-medium text-white">{label}</label>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClasses =
  "w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none transition focus:border-violet-500";
const inputErrorClasses =
  "w-full rounded-2xl border border-red-500/60 bg-[#0B0B12] px-4 py-3 text-white outline-none transition focus:border-red-500";

// Full validation pass — returns { fieldKey: errorMessage } for anything
// wrong. Kept as one function so the "does validation actually fire"
// question has one place to audit, instead of scattered ad hoc checks.
//
// ASSUMPTIONS (flagging since these weren't 100% explicit in the ask):
//   - budget / rewardPer1k must be > 0, not just "truthy" — the previous
//     check (`form.budget`) treated the string "0" as valid, which is a
//     real bug: a ₹0 budget or ₹0/1k reward shouldn't be allowed through.
//   - at least one platform must be selected — a campaign with zero
//     platforms doesn't make functional sense. Remove this block below
//     if that's not actually a requirement you want enforced.
//   - resources: required — at least one resource link must be added.
//   - description, clipperRequirements, thumbnail, maxEarnings stay
//     optional, matching the original form's intent (no "required"
//     marker was ever shown for them).
function validateCampaignForm(form) {
  const errors = {};

  const trimmedName = form.name.trim();
  if (!trimmedName) {
    errors.name = "Campaign name is required.";
  } else if (trimmedName.length < 3) {
    errors.name = "Campaign name must be at least 3 characters.";
  } else if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
    errors.name = "Campaign name can only contain letters, numbers, and spaces — no special characters.";
  }

  if (!form.thumbnail) {
    errors.thumbnail = "Upload a campaign thumbnail.";
  }

  const budget = Number(form.budget);
  if (!form.budget || Number.isNaN(budget) || budget <= 0) {
    errors.budget = "Enter a budget greater than ₹0.";
  }

  const rewardPer1k = Number(form.rewardPer1k);
  if (!form.rewardPer1k || Number.isNaN(rewardPer1k) || rewardPer1k <= 0) {
    errors.rewardPer1k = "Enter a reward greater than ₹0.";
  }

  if (form.maxEarnings) {
    const maxEarnings = Number(form.maxEarnings);
    if (Number.isNaN(maxEarnings) || maxEarnings <= 0) {
      errors.maxEarnings = "Max earnings must be greater than ₹0, or left blank.";
    }
  }

  if (form.platforms.length === 0) {
    errors.platforms = "Select at least one platform.";
  }

  if (form.resources.length === 0) {
    errors.resources = "Add at least one resource before submitting.";
  }

  if (form.endDate && form.startDate && form.endDate < form.startDate) {
    errors.endDate = "End date can't be before the start date.";
  }

  // Content template fields are guidance, not gated behind requiredness —
  // but if a brand fills in a duration range or example link, it should
  // at least make sense.
  const minDuration = form.minDurationSeconds ? Number(form.minDurationSeconds) : null;
  const maxDuration = form.maxDurationSeconds ? Number(form.maxDurationSeconds) : null;

  if (form.minDurationSeconds && (Number.isNaN(minDuration) || minDuration <= 0)) {
    errors.minDurationSeconds = "Enter a duration greater than 0 seconds.";
  }
  if (form.maxDurationSeconds && (Number.isNaN(maxDuration) || maxDuration <= 0)) {
    errors.maxDurationSeconds = "Enter a duration greater than 0 seconds.";
  }
  if (
    minDuration != null &&
    maxDuration != null &&
    !Number.isNaN(minDuration) &&
    !Number.isNaN(maxDuration) &&
    maxDuration < minDuration
  ) {
    errors.maxDurationSeconds = "Max duration can't be less than the minimum.";
  }

  if (form.exampleUrl.trim()) {
    try {
      new URL(form.exampleUrl.trim());
    } catch {
      errors.exampleUrl = "Enter a valid URL (including https://).";
    }
  }

  return errors;
}

function CampaignForm({ initialData, mode = "create", onSubmit, onSuccess }) {
  const [form, setForm] = useState({ ...emptyForm, ...initialData });
  const [resourceName, setResourceName] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceTemplate, setResourceTemplate] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStepIndex, setSubmitStepIndex] = useState(-1);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false); // State for discard confirmation
  const { showToast } = useToast();

  const SUBMIT_STEPS =
    mode === "edit" ? ["Saving your changes"] : ["Creating your campaign"];

  useEffect(() => {
    if (mode !== "create") return undefined;

    let isMounted = true;
    api("/api/settings/resource-template/")
      .then((template) => {
        if (isMounted) setResourceTemplate(template);
      })
      .catch(() => {
        // The template is optional guidance, so campaign creation remains available.
      });

    return () => {
      isMounted = false;
    };
  }, [mode]);

  const clearFieldError = (key) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    clearFieldError(key);
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    onSuccess?.(); // Navigate away or reset the form
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const validationErrors = validateCampaignForm(form);
    setErrors(validationErrors);

    const firstErrorKey = Object.keys(validationErrors)[0];
    if (firstErrorKey) {
      showToast({
        type: "error",
        title: "Check the form",
        message: validationErrors[firstErrorKey],
      });
      return;
    }

    setSubmitting(true);
    setSubmitStepIndex(0);

    try {
      await onSubmit?.(form);
      setSubmitStepIndex(1); // marks done -> ProcessingModal fires onComplete
    } catch (err) {
      setSubmitting(false);
      setSubmitStepIndex(-1);
      showToast({
        type: "error",
        title: mode === "edit" ? "Couldn't save changes" : "Couldn't create campaign",
        message: err?.message || "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ...existing sections... */}

        <Section title="Timeline">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Start Date">
              <DatePicker
                value={form.startDate}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
                placeholder="Select start date"
                popperPlacement="top-end" // Ensure DatePicker appears above if space is limited
              />
            </Field>
            <Field label="End Date" hint="Optional" error={errors.endDate}>
              <DatePicker
                value={form.endDate}
                onChange={(v) => {
                  const today = new Date().toISOString().split("T")[0];
                  if (v >= today) {
                    setForm((f) => ({ ...f, endDate: v }));
                    clearFieldError("endDate");
                  } else {
                    showToast({
                      type: "error",
                      message: "End date cannot be earlier than today.",
                    });
                  }
                }}
                minDate={form.startDate}
                clearable
                placeholder="Select end date"
                popperPlacement="top-end" // Ensure DatePicker appears above if space is limited
              />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end gap-4">
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="rounded-2xl bg-red-600 px-6 py-3 font-medium text-white transition hover:bg-red-500"
            >
              Discard Changes
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? mode === "edit"
                ? "Saving…"
                : "Creating…"
              : mode === "edit"
              ? "Save Changes"
              : "Create Campaign"}
          </button>
        </div>
      </form>

      {showDiscardConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-[#11111A] p-6 text-center">
            <h3 className="text-lg font-medium text-white">Discard Changes?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Are you sure you want to discard all changes? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-2xl bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscard}
                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <ProcessingModal
        isOpen={submitting}
        mode="controlled"
        title={mode === "edit" ? "Saving your changes" : "Creating your campaign"}
        steps={SUBMIT_STEPS}
        currentStepIndex={submitStepIndex}
        onComplete={() => {
          setSubmitting(false);
          setSubmitStepIndex(-1);
          onSuccess?.();
        }}
      />
    </>
  );
}
