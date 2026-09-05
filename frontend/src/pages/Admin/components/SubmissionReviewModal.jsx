import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  X,
  ExternalLink,
  ShieldCheck,
  Users,
  Target,
  ListChecks,
  Copy,
  Ruler,
  Check,
  AlertTriangle,
  Eye,
  UserRound,
  Layers,
} from "lucide-react";
import ProcessingModal from "../../../shared/ui/ProcessingModal"; // ADJUST to match this file's actual path

const FIRST_SUBMISSION_CHECKS = [
  { key: "accountLegitimacy", label: "Account legitimacy", hint: "Real, non-spam/bot account", icon: ShieldCheck },
  { key: "followersLegitimacy", label: "Followers legitimacy", hint: "Follower count isn't obviously bought or fake", icon: Users },
  { key: "audienceValidation", label: "Audience validation", hint: "Audience roughly matches the campaign's target", icon: Target },
];

const EVERY_SUBMISSION_CHECKS = [
  { key: "contentRequirements", label: "Content requirements met", hint: "Matches the brand/creator's stated requirements", icon: ListChecks },
  { key: "uniqueAccount", label: "Posted from a unique account", hint: "Not cross-posted elsewhere to farm payouts", icon: Copy },
  { key: "lengthRequirement", label: "Length requirement met", hint: "Meets the campaign's minimum content length", icon: Ruler },
];

function CheckRow({ item, value, onChange, disabled }) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{item.label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{item.hint}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" disabled={disabled} onClick={() => onChange(true)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${value === true ? "border-transparent bg-emerald-500 text-[#0A0A0F]" : "border-white/10 text-zinc-500 hover:border-emerald-500/40 hover:text-emerald-400"}`} title="Pass">
          <Check size={15} />
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(false)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${value === false ? "border-transparent bg-red-500 text-white" : "border-white/10 text-zinc-500 hover:border-red-500/40 hover:text-red-400"}`} title="Fail">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default function SubmissionReviewModal({ submission, onClose, onApprove, onReject }) {
  const [checks, setChecks] = useState(() => {
    const initial = {};
    for (const item of EVERY_SUBMISSION_CHECKS) initial[item.key] = null;
    if (submission.isFirstSubmission) {
      for (const item of FIRST_SUBMISSION_CHECKS) initial[item.key] = null;
    }
    return initial;
  });
  const [notes, setNotes] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const relevantChecks = submission.isFirstSubmission
    ? [...FIRST_SUBMISSION_CHECKS, ...EVERY_SUBMISSION_CHECKS]
    : EVERY_SUBMISSION_CHECKS;

  const allChecked = relevantChecks.every((item) => checks[item.key] !== null);
  const allPassed = relevantChecks.every((item) => checks[item.key] === true);
  const anyFailed = relevantChecks.some((item) => checks[item.key] === false);

  const setCheck = (key) => (value) => setChecks((c) => ({ ...c, [key]: value }));

  const handleApproveClick = () => {
    if (!allChecked || !allPassed) return;
    setProcessing(true);
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    onReject(submission.id, { reason: rejectReason.trim() });
  };

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#11111A] p-6 shadow-2xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/clippers/${submission.clipperUsername}`} className="text-lg font-semibold text-white hover:text-violet-300 hover:underline">{submission.clipperName}</Link>
                <span className="text-sm text-zinc-500">@{submission.clipperUsername}</span>
                {submission.isFirstSubmission && (
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                    First submission
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                {submission.campaignTitle} · <span className="text-zinc-500">{submission.brandName}</span>
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/admin/clippers/${submission.clipperUsername}`} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-violet-400/40 hover:text-violet-300">
              <UserRound size={13} />
              View Clipper
            </Link>
            {submission.campaignId ? (
              <Link to={`/admin/campaigns/${submission.campaignId}`} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-300">
                <Layers size={13} />
                View Campaign
              </Link>
            ) : null}
            <a href={submission.clipUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-violet-400 transition hover:border-violet-400/40">
              <ExternalLink size={13} />
              View Clip
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Eye size={15} className="text-zinc-500" />
              {submission.reportedViews.toLocaleString()} reported views
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{submission.platform}</span>
            <span className="text-xs text-zinc-500">Submitted {submission.submittedAt}</span>
          </div>

          {!rejectMode ? (
            <>
              {submission.isFirstSubmission && (
                <div className="mt-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    First-submission checks
                  </p>
                  <div className="space-y-2.5">
                    {FIRST_SUBMISSION_CHECKS.map((item) => (
                      <CheckRow key={item.key} item={item} value={checks[item.key]} onChange={setCheck(item.key)} disabled={processing} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Every-submission checks
                </p>
                <div className="space-y-2.5">
                  {EVERY_SUBMISSION_CHECKS.map((item) => (
                    <CheckRow key={item.key} item={item} value={checks[item.key]} onChange={setCheck(item.key)} disabled={processing} />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-white">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional, internal notes about this review"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={processing}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 disabled:opacity-60"
                />
              </div>

              {anyFailed && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  One or more checks failed. Reject this submission, or re-check the failing item if it was marked in error.
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button onClick={() => setRejectMode(true)} disabled={processing} className="rounded-full border border-red-500/20 px-5 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-60">
                  Reject
                </button>
                <button onClick={handleApproveClick} disabled={!allChecked || !allPassed || processing} className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-[#0A0A0F] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">
                  {!allChecked ? "Complete all checks to approve" : "Approve & update stats"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-white">
                Reason for rejection <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Let the clipper know what needs to change"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              />

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button onClick={() => setRejectMode(false)} className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20">
                  Back
                </button>
                <button onClick={handleRejectSubmit} disabled={!rejectReason.trim()} className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40">
                  Confirm rejection
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <ProcessingModal
        isOpen={processing}
        title="Approving submission"
        steps={["Confirming checklist", "Updating clipper stats", "Notifying clipper"]}
        onComplete={() => {
          setProcessing(false);
          onApprove(submission.id, { checks, notes });
        }}
      />
    </>,
    document.body
  );
}
