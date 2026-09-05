import { useState } from "react";
import { Plus, Trash2, ImagePlus, Check } from "lucide-react";
import { FaYoutube, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import DatePicker from "./DatePicker";
import useToast from "../hooks/useToast"; // adjust path to match this file's actual location
import ProcessingModal from "../shared/ui/ProcessingModal"; // adjust path to match this file's actual location

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

export default function CampaignForm({ initialData, mode = "create", onSubmit, onSuccess }) {
  const [form, setForm] = useState({ ...emptyForm, ...initialData });
  const [resourceName, setResourceName] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStepIndex, setSubmitStepIndex] = useState(-1);
  const { showToast } = useToast();

  const SUBMIT_STEPS =
    mode === "edit" ? ["Saving your changes"] : ["Creating your campaign"];

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

  const togglePlatform = (name) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(name)
        ? f.platforms.filter((p) => p !== name)
        : [...f.platforms, name],
    }));
    clearFieldError("platforms");
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
    reader.onload = () => setForm((f) => ({ ...f, thumbnail: reader.result }));
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
      resources: [...f.resources, { id: Date.now(), name: resourceName, url: trimmedUrl }],
    }));
    setResourceName("");
    setResourceUrl("");
    clearFieldError("resources");
  };

  const removeResource = (id) =>
    setForm((f) => ({ ...f, resources: f.resources.filter((r) => r.id !== id) }));

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
        <Section title="Basics">
          <div className="space-y-6">
            <Field label="Campaign Name" error={errors.name}>
              <input
                type="text"
                placeholder="Podcast Clips Campaign"
                value={form.name}
                onChange={set("name")}
                className={errors.name ? inputErrorClasses : inputClasses}
              />
            </Field>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Category">
                <select value={form.category} onChange={set("category")} className={inputClasses}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Campaign Thumbnail" error={errors.thumbnail}>
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
                    <img src={form.thumbnail} alt="Thumbnail preview" className="h-8 w-12 rounded-lg object-cover" />
                  ) : (
                    <ImagePlus size={18} />
                  )}
                  <span className="truncate text-sm">
                    {form.thumbnail ? "Change thumbnail" : "Upload thumbnail"}
                  </span>
                </label>
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows={4}
                placeholder="Describe your campaign..."
                value={form.description}
                onChange={set("description")}
                className={inputClasses}
              />
            </Field>

            <Field label="Clipper Requirements" hint="Instructions shown to clippers before they join">
              <textarea
                rows={4}
                placeholder="Give instructions to clippers..."
                value={form.clipperRequirements}
                onChange={set("clipperRequirements")}
                className={inputClasses}
              />
            </Field>
          </div>
        </Section>

        <Section title="Budget & Rewards">
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Total Budget (₹)" error={errors.budget}>
              <input
                type="number"
                min="1"
                placeholder="50000"
                value={form.budget}
                onChange={set("budget")}
                className={errors.budget ? inputErrorClasses : inputClasses}
              />
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

            <Field label="Max Earnings / Clipper (₹)" hint="Optional" error={errors.maxEarnings}>
              <input
                type="number"
                min="1"
                placeholder="5000"
                value={form.maxEarnings}
                onChange={set("maxEarnings")}
                className={errors.maxEarnings ? inputErrorClasses : inputClasses}
              />
            </Field>
          </div>
        </Section>

        <Section title="Platforms">
          <div className="grid gap-4 md:grid-cols-4">
            {PLATFORMS.map(({ name, icon: Icon }) => {
              const isSelected = form.platforms.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => togglePlatform(name)}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-white transition ${
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
                  <Icon size={32} className={isSelected ? "text-violet-400" : ""} />
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
          {errors.platforms && <p className="mt-3 text-xs text-red-400">{errors.platforms}</p>}
        </Section>

        <Section title="Resources">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              placeholder="Resource Name"
              className={errors.resources ? inputErrorClasses : inputClasses}
            />
            <input
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="Google Drive Link"
              className={errors.resources ? inputErrorClasses : inputClasses}
            />
          </div>

          <button
            type="button"
            onClick={addResource}
            className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-white transition hover:bg-violet-500"
          >
            <Plus size={16} />
            Add Resource
          </button>

          {errors.resources && <p className="mt-3 text-xs text-red-400">{errors.resources}</p>}

          {form.resources.length > 0 && (
            <div className="mt-6 space-y-3">
              {form.resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0B0B12] p-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-medium text-white">{resource.name}</h3>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm text-violet-400"
                    >
                      {resource.url}
                    </a>
                  </div>
                  <button type="button" onClick={() => removeResource(resource.id)}>
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Timeline">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Start Date">
              <DatePicker
                value={form.startDate}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
                placeholder="Select start date"
              />
            </Field>
            <Field label="End Date" hint="Optional" error={errors.endDate}>
              <DatePicker
                value={form.endDate}
                onChange={(v) => {
                  setForm((f) => ({ ...f, endDate: v }));
                  clearFieldError("endDate");
                }}
                minDate={form.startDate}
                clearable
                placeholder="Select end date"
              />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end">
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