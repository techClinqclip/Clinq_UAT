import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  X,
  ExternalLink,
  RadioTower,
  ListChecks,
  Gauge,
  Check,
  AlertTriangle,
  Eye,
  UserRound,
  Layers,
} from "lucide-react";
import ProcessingModal from "../../../shared/ui/ProcessingModal"; // ADJUST to match this file's actual path

const CHECKS = [
  {
    key: "notStillEarningElsewhere",
    label: "Not still earning elsewhere",
    hint: "Cross-checked, this content isn't also earning on the platform in the meantime",
    icon: RadioTower,
  },
  {
    key: "statsMatchCurrent",
    label: "Stats match current numbers",
    hint: "The pending amount lines up with the clip's current live stats",
    icon: ListChecks,
  },
  {
    key: "withinCap",
    label: "Amount is within CAP",
    hint: "Pending amount doesn't exceed the campaign's payout CAP",
    icon: Gauge,
  },
];

function CheckRow({ item, value, onChange, disabled, autoHint }) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{item.label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{item.hint}</p>
        {autoHint && <p className="mt-1 text-xs font-medium text-zinc-300">{autoHint}</p>}
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

export default function PendingApprovalReviewModal({ item, onClose, onApprove, onHold }) {
  const [checks, setChecks] = useState(() => {
    const initial = {};
    for (const c of CHECKS) initial[c.key] = null;
    return initial;
  });
  const [notes, setNotes] = useState("");
  const [holdMode, setHoldMode] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const allChecked = CHECKS.every((c) => checks[c.key] !== null);
  const allPassed = CHECKS.every((c) => checks[c.key] === true);
  const anyFailed = CHECKS.some((c) => checks[c.key] === false);

  const setCheck = (key) => (value) => setChecks((c) => ({ ...c, [key]: value }));

  const viewsDelta = item.liveViews - item.reportedViews;
  const overCap = item.pendingAmount > item.cap;

  const autoHints = {
    statsMatchCurrent:
      viewsDelta === 0
        ? "Live views match reported views exactly."
        : `Live views differ from reported by ${viewsDelta > 0 ? "+" : ""}${viewsDelta.toLocaleString()}.`,
    withinCap: overCap
      ? `₹${item.pendingAmount.toLocaleString()} exceeds the ₹${item.cap.toLocaleString()} CAP.`
      : `₹${item.pendingAmount.toLocaleString()} is within the ₹${item.cap.toLocaleString()} CAP.`,
  };

  const handleApproveClick = () => {
    if (!allChecked || !allPassed) return;
    setProcessing(true);
  };

  const handleHoldSubmit = () => {
    if (!holdReason.trim()) return;
    onHold(item.id, { reason: holdReason.trim() });
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
                <Link to={`/admin/clippers/${item.clipperUsername}`} className="text-lg font-semibold text-white hover:text-violet-300 hover:underline">{item.clipperName}</Link>
                <span className="text-sm text-zinc-500">@{item.clipperUsername}</span>
                {overCap && (
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-300">
                    Over CAP
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                {item.campaignTitle} · <span className="text-zinc-500">{item.brandName}</span>
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/admin/clippers/${item.clipperUsername}`} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-violet-400/40 hover:text-violet-300">
              <UserRound size={13} />
              View Clipper
            </Link>
            {item.campaignId ? (
              <Link to={`/admin/campaigns/${item.campaignId}`} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-300">
                <Layers size={13} />
                View Campaign
              </Link>
            ) : null}
            <a href={item.clipUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-violet-400 transition hover:border-violet-400/40">
              <ExternalLink size={13} />
              View Clip
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Eye size={15} className="text-zinc-500" />
              {item.liveViews.toLocaleString()} live views
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{item.platform}</span>
            <span className="text-sm font-semibold text-white">₹{item.pendingAmount.toLocaleString()} pending</span>
            <span className="text-xs text-zinc-500">Submitted {item.submittedAt}</span>
          </div>

          {!holdMode ? (
            <>
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Payout checks
                </p>
                <div className="space-y-2.5">
                  {CHECKS.map((c) => (
                    <CheckRow key={c.key} item={c} value={checks[c.key]} onChange={setCheck(c.key)} disabled={processing} autoHint={autoHints[c.key]} />
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
                  One or more checks failed. Hold this payout, or re-check the failing item if it was marked in error.
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button onClick={() => setHoldMode(true)} disabled={processing} className="rounded-full border border-red-500/20 px-5 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-60">
                  Hold
                </button>
                <button onClick={handleApproveClick} disabled={!allChecked || !allPassed || processing} className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-[#0A0A0F] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">
                  {!allChecked ? "Complete all checks to approve" : "Approve & release payout"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-white">
                Reason for hold <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Let the clipper know what needs to be resolved"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              />

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button onClick={() => setHoldMode(false)} className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/20">
                  Back
                </button>
                <button onClick={handleHoldSubmit} disabled={!holdReason.trim()} className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40">
                  Confirm hold
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <ProcessingModal
        isOpen={processing}
        title="Approving payout"
        steps={["Confirming checklist", "Releasing pending amount", "Notifying clipper"]}
        onComplete={() => {
          setProcessing(false);
          onApprove(item.id, { checks, notes });
        }}
      />
    </>,
    document.body
  );
}
