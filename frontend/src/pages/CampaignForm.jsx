import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ImagePlus,
  Check,
  Download,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { FaYoutube, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import DatePicker from "./DatePicker";
import useToast from "../hooks/useToast"; // adjust path to match this file's actual location
import ProcessingModal from "../shared/ui/ProcessingModal"; // adjust path to match this file's actual location
import { api } from "../lib/api";
import { downloadResourceSampleTemplate } from "../lib/resourceTemplate";
import ConfirmModal from "./clipper/components/ConfirmModal";

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
                   MUST return a Promise that rejects on failure
                   (and resolves on success). Should NOT navigate/redirect
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
  {
    value: "vertical",
    label: "Vertical (9:16)",
    hint: "Reels, Shorts, TikTok",
  },
  {
    value: "horizontal",
    label: "Horizontal (16:9)",
    hint: "YouTube, landscape",
  },
  {
    value: "square",
    label: "Square (1:1)",
    hint: "Feed posts",
  },
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

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#11111A] p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, optional = false, error, children }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex h-5 items-center gap-2">
        <label className="truncate text-sm font-medium leading-5 text-white">
          {label}
        </label>
        {optional ? (
          <span className="shrink-0 text-xs font-normal leading-5 text-zinc-500">
            Optional
          </span>
        ) : null}
      </div>
      {children}
      <p
        className={`mt-1.5 min-h-5 text-xs leading-5 ${
          error ? "text-red-400" : "text-zinc-500"
        }`}
      >
        {error || hint || "\u00A0"}
      </p>
    </div>
  );
}

const inputClasses =
  "h-[50px] w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 text-white outline-none transition focus:border-violet-500";

const textareaClasses =
  "w-full resize-y rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none transition focus:border-violet-500";

const inputErrorClasses =
  "h-[50px] w-full rounded-2xl border border-red-500/60 bg-[#0B0B12] px-4 text-white outline-none transition focus:border-red-500";


// Full validation pass — returns { fieldKey: errorMessage } for anything
// wrong. Kept as one function so the "does validation actually fire"
// question has one place to audit, instead of scattered ad hoc checks.
//
// ASSUMPTIONS:
//   - budget / rewardPer1k must be > 0, not just "truthy"
//   - at least one platform must be selected
//   - resources: required — at least one resource link must be added
//   - description, clipperRequirements, thumbnail, maxEarnings stay
//     optional, matching the original form's intent
function validateCampaignForm(form, mode = "create", kind = "campaign") {
  const errors = {};
  const noun = kind === "gig" ? "gig" : "campaign";
  const Noun = kind === "gig" ? "Gig" : "Campaign";

  const trimmedName = form.name.trim();

  if (!trimmedName) {
    errors.name = `${Noun} name is required.`;
  } else if (trimmedName.length < 3) {
    errors.name = `${Noun} name must be at least 3 characters.`;
  } else if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
    errors.name =
      `${Noun} name can only contain letters, numbers, and spaces — no special characters.`;
  }

  if (!form.thumbnail) {
    errors.thumbnail = `Upload a ${noun} thumbnail.`;
  }

  const budget = Number(form.budget);

  if (!form.budget || Number.isNaN(budget) || budget <= 0) {
    errors.budget = "Enter a budget greater than ₹0.";
  }

  const rewardPer1k = Number(form.rewardPer1k);

  if (
    !form.rewardPer1k ||
    Number.isNaN(rewardPer1k) ||
    rewardPer1k <= 0
  ) {
    errors.rewardPer1k = "Enter a reward greater than ₹0.";
  }

  if (form.maxEarnings) {
    const maxEarnings = Number(form.maxEarnings);

    if (Number.isNaN(maxEarnings) || maxEarnings <= 0) {
      errors.maxEarnings =
        "Max earnings must be greater than ₹0, or left blank.";
    } else if (!Number.isNaN(budget) && budget > 0 && maxEarnings > budget) {
      errors.maxEarnings =
        "Max earnings per clipper cannot be greater than the total budget.";
    }
  }

  if (form.platforms.length === 0) {
    errors.platforms = "Select at least one platform.";
  }

  if (form.resources.length === 0) {
    errors.resources = "Add at least one resource before submitting.";
  }

  // In edit mode, an existing campaign may have started in the past.
  // The end date can still be changed, but it cannot be set to a
  // date before today.
  if (
    mode === "edit" &&
    form.endDate &&
    form.endDate < getTodayDate()
  ) {
    errors.endDate = "End date can't be before today.";
  }

  // Keep the existing start/end date validation for both create and edit.
  if (
    form.endDate &&
    form.startDate &&
    form.endDate < form.startDate
  ) {
    errors.endDate = "End date can't be before the start date.";
  }

  // Content template fields are guidance, not gated behind requiredness —
  // but if a brand fills in a duration range or example link, it should
  // at least make sense.
  const minDuration = form.minDurationSeconds
    ? Number(form.minDurationSeconds)
    : null;

  const maxDuration = form.maxDurationSeconds
    ? Number(form.maxDurationSeconds)
    : null;

  if (
    form.minDurationSeconds &&
    (Number.isNaN(minDuration) || minDuration <= 0)
  ) {
    errors.minDurationSeconds =
      "Enter a duration greater than 0 seconds.";
  }

  if (
    form.maxDurationSeconds &&
    (Number.isNaN(maxDuration) || maxDuration <= 0)
  ) {
    errors.maxDurationSeconds =
      "Enter a duration greater than 0 seconds.";
  }

  if (
    minDuration != null &&
    maxDuration != null &&
    !Number.isNaN(minDuration) &&
    !Number.isNaN(maxDuration) &&
    maxDuration < minDuration
  ) {
    errors.maxDurationSeconds =
      "Max duration can't be less than the minimum.";
  }

  if (form.exampleUrl.trim()) {
    try {
      new URL(form.exampleUrl.trim());
    } catch {
      errors.exampleUrl =
        "Enter a valid URL (including https://).";
    }
  }

  return errors;
}

export default function CampaignForm({
  initialData,
  mode = "create",
  kind = "campaign",
  onSubmit,
  onSuccess,
}) {
  const isGig = kind === "gig";
  const noun = isGig ? "gig" : "campaign";
  const Noun = isGig ? "Gig" : "Campaign";

  const [form, setForm] = useState({
    ...emptyForm,
    ...initialData,
  });

  const [resourceName, setResourceName] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceTemplate, setResourceTemplate] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStepIndex, setSubmitStepIndex] = useState(-1);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const { showToast } = useToast();

  const SUBMIT_STEPS =
    mode === "edit"
      ? ["Saving your changes"]
      : [`Creating your ${noun}`];

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
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));

    clearFieldError(key);
  };

  const togglePlatform = (name) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(name)
        ? f.platforms.filter((p) => p !== name)
        : [...f.platforms, name],
    }));

    clearFieldError("platforms");
  };

  const downloadTemplate = async () => {
    try {
      await downloadResourceSampleTemplate(resourceTemplate?.filename);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error.message ||
          "Unable to download the resource sample template.",
      });
    }
  };

  const toggleOrientation = (value) => {
    setForm((f) => ({
      ...f,
      contentOrientations: f.contentOrientations.includes(value)
        ? f.contentOrientations.filter((o) => o !== value)
        : [...f.contentOrientations, value],
    }));
  };

  const toggleContentRequirement = (value) => {
    setForm((f) => ({
      ...f,
      contentRequirements: f.contentRequirements.includes(value)
        ? f.contentRequirements.filter((r) => r !== value)
        : [...f.contentRequirements, value],
    }));
  };

  const handleThumbnail = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () =>
      setForm((f) => ({
        ...f,
        thumbnail: reader.result,
      }));

    reader.readAsDataURL(file);

    clearFieldError("thumbnail");
  };

  const addResource = () => {
    if (!resourceName.trim() || !resourceUrl.trim()) return;

    const trimmedUrl = resourceUrl.trim();

    try {
      new URL(trimmedUrl);
    } catch {
      showToast({
        type: "error",
        title: "Invalid resource link",
        message: "Enter a valid URL (including https://).",
      });

      return;
    }

    setForm((f) => ({
      ...f,
      resources: [
        ...f.resources,
        {
          id: Date.now(),
          name: resourceName,
          url: trimmedUrl,
        },
      ],
    }));

    setResourceName("");
    setResourceUrl("");

    clearFieldError("resources");
  };

  const removeResource = (id) =>
    setForm((f) => ({
      ...f,
      resources: f.resources.filter((r) => r.id !== id),
    }));

    const handleDiscard = () => {
      setShowDiscardModal(true);
    };
    
    const confirmDiscard = () => {
      setShowDiscardModal(false);
      window.history.back();
    };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const validationErrors = validateCampaignForm(form, mode, kind);

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
        title:
          mode === "edit"
            ? "Couldn't save changes"
            : `Couldn't create ${noun}`,
        message:
          err?.message ||
          "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Basics">
          <div className="space-y-6">
            <Field label={`${Noun} Name`} error={errors.name}>
              <input
                type="text"
                placeholder={isGig ? "Podcast Clips Gig" : "Podcast Clips Campaign"}
                value={form.name}
                onChange={set("name")}
                className={
                  errors.name
                    ? inputErrorClasses
                    : inputClasses
                }
              />
            </Field>

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={set("category")}
                  className={inputClasses}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field
                label={`${Noun} Thumbnail`}
                error={errors.thumbnail}
              >
                <label
                  htmlFor="thumbnail-upload"
                  className={`flex h-[50px] cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 transition hover:text-white ${
                    errors.thumbnail
                      ? "border-red-500/60 text-red-300 hover:border-red-500/80"
                      : "border-white/15 text-zinc-400 hover:border-violet-500/50"
                  }`}
                >
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnail}
                    className="hidden"
                  />

                  {form.thumbnail ? (
                    <img
                      src={form.thumbnail}
                      alt="Thumbnail preview"
                      className="h-8 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <ImagePlus size={18} />
                  )}

                  <span className="truncate text-sm">
                    {form.thumbnail
                      ? "Change thumbnail"
                      : "Upload thumbnail"}
                  </span>
                </label>
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows={4}
                placeholder={`Describe your ${noun}...`}
                value={form.description}
                onChange={set("description")}
                className={textareaClasses}
              />
            </Field>

            <Field
              label="Clipper Requirements"
              hint="Instructions shown to clippers before they join"
            >
              <textarea
                rows={4}
                placeholder="Give instructions to clippers..."
                value={form.clipperRequirements}
                onChange={set("clipperRequirements")}
                className={textareaClasses}
              />
            </Field>
          </div>
        </Section>

        <Section title="Budget & Rewards">
          {mode === "create" ? (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <p>
                You cannot change the budget later. Set the total budget carefully
                before publishing.
              </p>
            </div>
          ) : (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-400">
              <Lock size={16} className="mt-0.5 shrink-0 text-zinc-500" />
              <p>Total budget is locked and cannot be edited after creation.</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-3">
            <Field label="Total Budget (₹)" error={errors.budget}>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  placeholder="50000"
                  value={form.budget}
                  onChange={set("budget")}
                  disabled={mode === "edit"}
                  readOnly={mode === "edit"}
                  className={
                    mode === "edit"
                      ? `${inputClasses} cursor-not-allowed pr-24 opacity-80`
                      : errors.budget
                      ? inputErrorClasses
                      : inputClasses
                  }
                />
                {mode === "edit" ? (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#11111A] px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                      <Lock size={11} />
                      Locked
                    </span>
                  </span>
                ) : null}
              </div>
            </Field>

            <Field label="Reward / 1K Views (₹)" error={errors.rewardPer1k}>
              <input
                type="number"
                min="1"
                placeholder="20"
                value={form.rewardPer1k}
                onChange={set("rewardPer1k")}
                className={errors.rewardPer1k ? inputErrorClasses : inputClasses}
              />
            </Field>

            <Field
              label="Max Earnings / Clipper (₹)"
              hint="Optional. Cannot exceed total budget."
              error={errors.maxEarnings}
            >
              <input
                type="number"
                min="1"
                max={form.budget || undefined}
                placeholder="5000"
                value={form.maxEarnings}
                onChange={set("maxEarnings")}
                className={errors.maxEarnings ? inputErrorClasses : inputClasses}
              />
            </Field>
          </div>
        </Section>

        <Section title="Platforms">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PLATFORMS.map(({ name, icon: Icon }) => {
              const isSelected = form.platforms.includes(name);

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => togglePlatform(name)}
                  aria-pressed={isSelected}
                  className={`group relative flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-white transition ${
                    isSelected
                      ? "border-violet-500 bg-violet-500/10"
                      : errors.platforms
                      ? "border-red-500/40 bg-[#0B0B12] hover:border-red-500/60"
                      : "border-white/10 bg-[#0B0B12] hover:border-violet-500/40"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                      <Check size={12} className="text-white" />
                    </span>
                  )}

                  <Icon
                    size={32}
                    className={
                      isSelected ? "text-violet-400" : ""
                    }
                  />

                  <span>{name}</span>
                </button>
              );
            })}
          </div>

          {errors.platforms && (
            <p className="mt-3 text-xs text-red-400">
              {errors.platforms}
            </p>
          )}
        </Section>

        <Section title="Resources">
          {resourceTemplate?.documentUrl && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  Need a starting point?
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Download the approved resource sample template
                  before adding your own links.
                </p>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/40 px-4 text-sm font-medium text-violet-200 transition hover:border-violet-300 hover:bg-violet-500/10"
              >
                <Download size={16} />
                Download template
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
            <Field label="Resource Name" error={errors.resources}>
              <input
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="Episode footage"
                className={errors.resources ? inputErrorClasses : inputClasses}
              />
            </Field>

            <Field label="Google Drive Link">
              <input
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className={errors.resources ? inputErrorClasses : inputClasses}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={addResource}
            className="mt-2 inline-flex h-[50px] items-center gap-2 rounded-xl bg-violet-600 px-4 text-white transition hover:bg-violet-500"
          >
            <Plus size={16} />
            Save Resource
          </button>

          {form.resources.length > 0 && (
            <div className="mt-6 space-y-3">
              {form.resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0B0B12] p-4"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-white">
                      {resource.name}
                    </h3>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm text-violet-400"
                    >
                      {resource.url}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeResource(resource.id)}
                    className="shrink-0 rounded-lg p-2 text-red-400 transition hover:bg-red-500/10"
                    aria-label="Remove resource"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Timeline">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
            <Field label="Start Date">
              <DatePicker
                value={form.startDate}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    startDate: v,
                  }))
                }
                placeholder="Select start date"
              />
            </Field>

            <Field
              label="End Date"
              optional
              error={errors.endDate}
            >
              <DatePicker
                value={form.endDate}
                onChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    endDate: v,
                  }));

                  clearFieldError("endDate");
                }}
                minDate={
                  mode === "edit"
                    ? getTodayDate()
                    : form.startDate
                }
                clearable
                placeholder="Select end date"
                className={errors.endDate ? "border-red-500/60 focus:border-red-500" : ""}
              />
            </Field>
          </div>
        </Section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={submitting}
              className="h-[50px] rounded-2xl border border-white/10 bg-white/5 px-6 font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Discard
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-[50px] rounded-2xl bg-violet-600 px-6 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? mode === "edit"
                ? "Saving…"
                : "Creating…"
              : mode === "edit"
              ? "Save Changes"
              : `Create ${Noun}`}
          </button>
        </div>
</form>

<ConfirmModal
  open={showDiscardModal}
  title="Discard changes?"
  description="Are you sure you want to discard your changes? Any unsaved changes will be lost."
  icon={AlertTriangle}
  color="red"
  confirmText="Discard Changes"
  cancelText="Keep Editing"
  onCancel={() => setShowDiscardModal(false)}
  onConfirm={confirmDiscard}
/>

<ProcessingModal
  isOpen={submitting}
  mode="controlled"
  title={
    mode === "edit"
      ? "Saving your changes"
      : `Creating your ${noun}`
  }
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