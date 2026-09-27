import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  XCircle,
} from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";
import AdminLoadingSkeleton, { AdminListSkeleton } from "./components/AdminLoadingSkeleton";
import ManualPayoutModal from "./components/ManualPayoutModal";
import RejectPayoutModal from "./components/RejectPayoutModal";

const MODE_LABELS = {
  manual: "Manual Pay",
  razorpay_with_approval: "RazorpayX + Approval",
  razorpay_autopay: "RazorpayX Autopay",
};

const STATUS_FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Rejected" },
  { id: "failed", label: "Failed" },
  { id: "all", label: "All" },
];

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-300",
  completed: "bg-emerald-500/10 text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-300",
  failed: "bg-zinc-500/10 text-zinc-300",
};

const STATUS_SECTION_ORDER = ["pending", "completed", "rejected", "failed"];

function ConfirmToggleModal({ open, title, body, confirmLabel, confirmClassName, onCancel, onConfirm, busy }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131316] p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <ShieldAlert size={18} className="text-amber-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${confirmClassName}`}
          >
            {busy ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ title, description, enabled, onToggle, disabled = false }) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/10 py-5 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-10 w-16 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
          enabled ? "bg-violet-600" : "bg-zinc-700"
        }`}
        aria-label={title}
      >
        <span
          className={`absolute top-1 h-8 w-8 rounded-full bg-white transition ${
            enabled ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function PayoutRow({ item, manualPay, actionId, onApprove, onReject }) {
  const isUpi = item.paymentMethod === "upi";
  const MethodIcon = isUpi ? Smartphone : Building2;
  const status = (item.status || "pending").toLowerCase();
  const canAct = status === "pending";

  return (
    <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{item.userEmail || `User #${item.userId}`}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
            {status}
          </span>
        </div>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <MethodIcon size={15} className="text-violet-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {isUpi ? "UPI destination" : "Bank destination"}
            </p>
            <p className="mt-1 text-sm text-zinc-200 break-all">
              {item.destinationLabel || item.paymentDetails || "—"}
            </p>
            {item.destinationHint ? (
              <p className="mt-1 text-xs text-zinc-500">{item.destinationHint}</p>
            ) : null}
            {item.externalRef && status !== "pending" ? (
              <p className="mt-1 text-xs text-zinc-500">Ref: {item.externalRef}</p>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Requested {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"} · ID #{item.id}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <span className="text-lg font-semibold text-white">
          ₹{Number(item.amount || 0).toLocaleString()}
        </span>
        {canAct ? (
          <>
            <button
              type="button"
              disabled={actionId === item.id}
              onClick={() => onApprove(item)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {manualPay ? "Mark paid" : "Approve & pay"}
            </button>
            <button
              type="button"
              disabled={actionId === item.id}
              onClick={() => onReject(item)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              <XCircle size={14} />
              Reject
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminPayoutApproval() {
  const { showToast } = useToast();
  const [manualPay, setManualPay] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [mode, setMode] = useState("manual");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [queue, setQueue] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    completed: 0,
    rejected: 0,
    failed: 0,
    all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [manualItem, setManualItem] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);

  const applySettings = (data) => {
    setManualPay(Boolean(data.manualPay));
    setRequireApproval(Boolean(data.requirePayoutApproval));
    setMode(
      data.mode ||
        (data.manualPay
          ? "manual"
          : data.requirePayoutApproval
            ? "razorpay_with_approval"
            : "razorpay_autopay")
    );
  };

  const loadQueue = useCallback(async (filter = statusFilter) => {
    const data = await api(`/api/earnings/payout/admin-queue/?status=${filter}`);
    applySettings(data);
    setQueue(Array.isArray(data.results) ? data.results : []);
    setCounts({
      pending: Number(data.counts?.pending ?? data.pendingCount ?? 0),
      completed: Number(data.counts?.completed ?? data.completedCount ?? 0),
      rejected: Number(data.counts?.rejected ?? data.rejectedCount ?? 0),
      failed: Number(data.counts?.failed ?? data.failedCount ?? 0),
      all: Number(data.counts?.all ?? 0),
    });
  }, [statusFilter]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await loadQueue(statusFilter);
      } catch (error) {
        if (mounted) {
          showToast({ type: "error", message: error?.message || "Unable to load payout approval." });
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadQueue, showToast, statusFilter]);

  const pendingAmount = useMemo(
    () =>
      queue
        .filter((item) => (item.status || "").toLowerCase() === "pending")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [queue]
  );

  const groupedSections = useMemo(() => {
    if (statusFilter !== "all") return null;
    const groups = {
      pending: [],
      completed: [],
      rejected: [],
      failed: [],
    };
    for (const item of queue) {
      const key = (item.status || "pending").toLowerCase();
      if (groups[key]) groups[key].push(item);
    }
    return STATUS_SECTION_ORDER
      .map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        items: groups[key],
      }))
      .filter((section) => section.items.length > 0);
  }, [queue, statusFilter]);

  const openManualConfirm = (nextValue) => {
    setConfirmConfig({
      key: "manualPay",
      value: nextValue,
      title: nextValue ? "Enable Manual Pay?" : "Disable Manual Pay?",
      body: nextValue
        ? "Admin will pay each withdrawal manually and enter UTR/reference to mark it paid. RazorpayX autopay will not run."
        : "System will switch to RazorpayX autopay. Use “With approval” to decide whether admin approval is required before transfer.",
      confirmLabel: nextValue ? "Enable Manual Pay" : "Use RazorpayX Autopay",
      confirmClassName: nextValue ? "bg-violet-600 hover:bg-violet-500" : "bg-amber-600 hover:bg-amber-500",
    });
  };

  const openApprovalConfirm = (nextValue) => {
    setConfirmConfig({
      key: "requirePayoutApproval",
      value: nextValue,
      title: nextValue ? "Enable approval for RazorpayX?" : "Disable approval for RazorpayX?",
      body: nextValue
        ? "New withdrawal requests will wait for admin approval. After approval, RazorpayX transfers money and stores data automatically."
        : "New withdrawal requests will transfer via RazorpayX immediately and store data automatically.",
      confirmLabel: nextValue ? "Enable With Approval" : "Disable Approval (full autopay)",
      confirmClassName: nextValue ? "bg-violet-600 hover:bg-violet-500" : "bg-amber-600 hover:bg-amber-500",
    });
  };

  const confirmToggle = async () => {
    if (!confirmConfig) return;
    setSavingToggle(true);
    try {
      const body =
        confirmConfig.key === "manualPay"
          ? { manualPay: confirmConfig.value }
          : { requirePayoutApproval: confirmConfig.value };
      const updated = await api("/api/settings/payout-approval/", {
        method: "PATCH",
        body,
      });
      applySettings(updated);
      setConfirmConfig(null);
      showToast({
        type: "success",
        message: `Payout mode updated: ${MODE_LABELS[updated.mode] || updated.mode}.`,
      });
    } catch (error) {
      showToast({ type: "error", message: error?.message || "Unable to update payout settings." });
    } finally {
      setSavingToggle(false);
    }
  };

  const handleApproveClick = (item) => {
    if (manualPay) {
      setManualItem(item);
      return;
    }
    approveWithRazorpay(item.id);
  };

  const approveWithRazorpay = async (id) => {
    setActionId(id);
    try {
      const result = await api("/api/earnings/payout/admin-approve/", {
        method: "POST",
        body: { transactionId: id },
      });
      showToast({
        type: "success",
        message: result?.message || "Withdrawal approved and RazorpayX payout triggered.",
      });
      await loadQueue(statusFilter);
    } catch (error) {
      showToast({ type: "error", message: error?.message || "Unable to approve withdrawal." });
    } finally {
      setActionId(null);
    }
  };

  const confirmManualPaid = async ({ transactionId, paymentReference, notes }) => {
    setActionId(transactionId);
    try {
      const result = await api("/api/earnings/payout/admin-approve/", {
        method: "POST",
        body: { transactionId, paymentReference, notes },
      });
      showToast({
        type: "success",
        message: result?.message || "Withdrawal marked paid manually.",
      });
      setManualItem(null);
      await loadQueue(statusFilter);
    } catch (error) {
      showToast({ type: "error", message: error?.message || "Unable to mark withdrawal as paid." });
    } finally {
      setActionId(null);
    }
  };

  const confirmReject = async ({ transactionId, reason }) => {
    setActionId(transactionId);
    try {
      const result = await api("/api/earnings/payout/admin-reject/", {
        method: "POST",
        body: { transactionId, reason },
      });
      showToast({
        type: "success",
        message: result?.message || "Withdrawal rejected and balance restored.",
      });
      setRejectItem(null);
      await loadQueue(statusFilter);
    } catch (error) {
      showToast({ type: "error", message: error?.message || "Unable to reject withdrawal." });
    } finally {
      setActionId(null);
    }
  };

  if (loading && !hasLoadedOnce) {
    return <AdminLoadingSkeleton variant="default" />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
          Admin Panel
        </span>
        <h1 className="mt-5 text-4xl font-bold">Payout Approval</h1>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
          Review all withdrawal payouts. Filter by status — default view is Pending.
        </p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Clock3 className="mb-4 text-amber-400" size={28} />
          <p className="text-sm text-zinc-500">Pending</p>
          <h3 className="mt-2 text-3xl font-bold">{counts.pending}</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <CheckCircle2 className="mb-4 text-emerald-400" size={28} />
          <p className="text-sm text-zinc-500">Completed</p>
          <h3 className="mt-2 text-3xl font-bold">{counts.completed}</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <XCircle className="mb-4 text-rose-400" size={28} />
          <p className="text-sm text-zinc-500">Rejected</p>
          <h3 className="mt-2 text-3xl font-bold">{counts.rejected}</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <CircleDollarSign className="mb-4 text-violet-400" size={28} />
          <p className="text-sm text-zinc-500">Mode</p>
          <h3 className="mt-2 text-2xl font-bold">{MODE_LABELS[mode] || mode}</h3>
          {statusFilter === "pending" ? (
            <p className="mt-2 text-xs text-zinc-500">Pending amount ₹{pendingAmount.toLocaleString()}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] px-6">
        <ToggleRow
          title="Manual Pay"
          description={
            manualPay
              ? "ON: pay each request offline, then mark paid with UTR/reference. RazorpayX will not run."
              : "OFF: RazorpayX autopay is active. Use “With approval” below for gated or full autopay."
          }
          enabled={manualPay}
          onToggle={() => openManualConfirm(!manualPay)}
        />
        <ToggleRow
          title="With approval (RazorpayX)"
          description={
            manualPay
              ? "Available only when Manual Pay is OFF."
              : requireApproval
                ? "ON: admin must approve; then RazorpayX transfers money and stores data automatically."
                : "OFF: RazorpayX transfers money and stores data automatically for every new request."
          }
          enabled={!manualPay && requireApproval}
          disabled={manualPay}
          onToggle={() => openApprovalConfirm(!requireApproval)}
        />
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Payout requests</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Showing {statusFilter === "all" ? "all statuses" : statusFilter} · {queue.length} result
                {queue.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await loadQueue(statusFilter);
                  showToast({ type: "success", message: "Queue refreshed." });
                } catch (error) {
                  showToast({ type: "error", message: error?.message || "Refresh failed." });
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const count = counts[filter.id] ?? 0;
              const active = statusFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-violet-600 text-white"
                      : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {filter.label}
                  <span className={`ml-2 ${active ? "text-violet-100" : "text-zinc-500"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <AdminListSkeleton rows={6} />
        ) : queue.length === 0 ? (
          <p className="p-6 text-zinc-400">
            No {statusFilter === "all" ? "" : `${statusFilter} `}payouts found.
          </p>
        ) : statusFilter === "all" ? (
          <div className="divide-y divide-white/10">
            {(groupedSections || []).map((section) => (
              <div key={section.key}>
                <div className="flex items-center justify-between bg-white/[0.02] px-6 py-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                    {section.label}
                  </h3>
                  <span className="text-xs text-zinc-500">{section.items.length} request{section.items.length === 1 ? "" : "s"}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {section.items.map((item) => (
                    <PayoutRow
                      key={item.id}
                      item={item}
                      manualPay={manualPay}
                      actionId={actionId}
                      onApprove={handleApproveClick}
                      onReject={setRejectItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {queue.map((item) => (
              <PayoutRow
                key={item.id}
                item={item}
                manualPay={manualPay}
                actionId={actionId}
                onApprove={handleApproveClick}
                onReject={setRejectItem}
              />
            ))}
          </div>
        )}
      </section>

      <ConfirmToggleModal
        open={Boolean(confirmConfig)}
        title={confirmConfig?.title}
        body={confirmConfig?.body}
        confirmLabel={confirmConfig?.confirmLabel}
        confirmClassName={confirmConfig?.confirmClassName}
        busy={savingToggle}
        onCancel={() => {
          if (savingToggle) return;
          setConfirmConfig(null);
        }}
        onConfirm={confirmToggle}
      />

      <ManualPayoutModal
        open={Boolean(manualItem)}
        item={manualItem}
        busy={actionId === manualItem?.id}
        onClose={() => {
          if (actionId === manualItem?.id) return;
          setManualItem(null);
        }}
        onConfirm={confirmManualPaid}
      />

      <RejectPayoutModal
        open={Boolean(rejectItem)}
        item={rejectItem}
        busy={actionId === rejectItem?.id}
        onClose={() => {
          if (actionId === rejectItem?.id) return;
          setRejectItem(null);
        }}
        onConfirm={confirmReject}
      />
    </div>
  );
}
