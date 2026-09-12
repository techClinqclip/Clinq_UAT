import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LifeBuoy,
  AlertCircle,
  Clock3,
  CheckCircle2,
  X,
  Send,
  Plus,
  ChevronDown,
  Flag,
  Layers3,
  LoaderCircle,
  MessageCircle,
} from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";

/*
  Admin — Support Tickets. From the spec sheet's fourth admin section.
  List + a per-ticket thread modal (reply, change status). Same portal
  pattern as the review modals — see SubmissionReviewModal for why.
*/

const ROLE_STYLES = {
  brand: "bg-cyan-500/10 text-cyan-300",
  creator: "bg-violet-500/10 text-violet-300",
  clipper: "bg-amber-500/10 text-amber-300",
};

const PRIORITY_STYLES = {
  Low: "bg-white/5 text-zinc-400",
  Medium: "bg-amber-500/10 text-amber-400",
  High: "bg-rose-500/10 text-rose-400",
};

const STATUS_STYLES = {
  Open: "bg-rose-500/10 text-rose-400",
  "In Progress": "bg-amber-500/10 text-amber-400",
  Resolved: "bg-emerald-500/10 text-emerald-400",
};

const CATEGORY_OPTIONS = [
  { value: "All", label: "All categories" },
  { value: "technical", label: "Technical issue" },
  { value: "billing", label: "Billing & payments" },
  { value: "account", label: "Account issue" },
  { value: "content", label: "Content related" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];
const USER_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter((option) => option.value !== "All");
const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "All"];

const displayValue = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function mapTicket(ticket) {
  return {
    ...ticket,
    requesterName: ticket.user_email || "User",
    requesterRole: ticket.user_type || "user",
    category: displayValue(ticket.category),
    categoryValue: ticket.category,
    priority: displayValue(ticket.priority),
    status: displayValue(ticket.status),
    createdAt: new Date(ticket.created_at).toLocaleString(),
    messages: (ticket.messages || []).map((message) => ({
      from: message.sender_role === "admin" ? "admin" : "user",
      text: message.body,
      at: new Date(message.created_at).toLocaleString(),
    })),
  };
}

function mapMessage(message) {
  return {
    from: message.sender_role === "admin" ? "admin" : "user",
    text: message.body,
    at: new Date(message.created_at).toLocaleString(),
  };
}

function SelectField({ label, value, onChange, options, icon: Icon }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        <Icon size={13} className="text-violet-400" />
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 pr-10 text-sm text-white outline-none transition hover:border-white/20 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      </div>
    </label>
  );
}

function TicketListSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-label="Loading support tickets">
      {[0, 1, 2].map((index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-4 w-3/5 rounded bg-white/[0.08]" />
              <div className="h-3 w-2/5 rounded bg-white/[0.05]" />
            </div>
            <div className="h-6 w-16 rounded-full bg-white/[0.06]" />
          </div>
          <div className="mt-4 h-3 w-1/3 rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

function UserSupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subject: "", description: "", category: "other", priority: "medium" });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    api("/api/support/tickets/?summary=true")
      .then((response) => {
        if (active) setTickets((response.results || response).map(mapTicket));
      })
      .catch((error) => {
        if (active) showToast({ type: "error", message: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let active = true;

    api(`/api/support/tickets/${selectedId}/messages/`)
      .then((messages) => {
        if (active) {
          setTickets((previous) => previous.map((ticket) => ticket.id === selectedId
            ? { ...ticket, messages: messages.map(mapMessage) }
            : ticket));
        }
      })
      .catch((error) => {
        if (active) showToast({ type: "error", message: error.message });
      });

    showToast({ type: "info", title: "Ticket chat opened", message: "You can now chat with the support team." });
    return () => { active = false; };
  }, [selectedId, showToast]);

  const submitTicket = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await api("/api/support/tickets/", { method: "POST", body: form });
      setTickets((previous) => [mapTicket(created), ...previous]);
      setForm({ subject: "", description: "", category: "other", priority: "medium" });
      showToast({ type: "success", message: "Support ticket created." });
    } catch (error) {
      showToast({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedId || !messageText.trim()) return;
    try {
      const message = await api(`/api/support/tickets/${selectedId}/messages/`, {
        method: "POST",
        body: { body: messageText.trim() },
      });
      setTickets((previous) => previous.map((ticket) => ticket.id === selectedId
        ? { ...ticket, status: "Open", messages: [...ticket.messages, { from: "user", text: message.body, at: new Date(message.created_at).toLocaleString() }] }
        : ticket));
      setMessageText("");
      showToast({ type: "success", message: "Message sent to the support team." });
    } catch (error) {
      showToast({ type: "error", message: error.message });
    }
  };

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId);

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-black text-white xl:h-[calc(100dvh-9rem)] xl:min-h-0 xl:overflow-hidden">
      <Breadcrumbs />
      <section className="shrink-0 rounded-3xl border border-white/10 bg-gradient-to-r from-violet-500/[0.08] via-white/[0.03] to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <LifeBuoy size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Help &amp; Support</h1>
            <p className="mt-0.5 text-sm text-zinc-400">Create a ticket and track responses from the support team.</p>
          </div>
        </div>
      </section>
      <section className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={submitTicket} className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">New ticket</h2>
              <p className="mt-1 text-sm text-zinc-500">Tell us what happened and we will take it from there.</p>
            </div>
            <MessageCircle size={19} className="text-violet-400" />
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Subject</span>
            <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Briefly describe the issue" className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Description</span>
            <textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Include the steps you took and what you expected to happen." rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField label="Category" icon={Layers3} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} options={USER_CATEGORY_OPTIONS} />
            <SelectField label="Priority" icon={Flag} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} options={['low', 'medium', 'high', 'urgent'].map((value) => ({ value, label: displayValue(value) }))} />
          </div>
          <button type="submit" disabled={isSubmitting} className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
            {isSubmitting ? "Creating ticket..." : "Create ticket"}
          </button>
        </form>
        <div className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Your tickets</h2>
              <p className="mt-1 text-sm text-zinc-500">Open any ticket to continue the conversation.</p>
            </div>
            <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300">{tickets.length} total</span>
          </div>
          {loading ? <TicketListSkeleton /> : tickets.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center py-10 text-center"><LifeBuoy size={34} className="mb-3 text-zinc-600" /><p className="font-medium text-zinc-300">No support tickets yet</p><p className="mt-1 text-sm text-zinc-500">Create a ticket and our team will respond here.</p></div> : <div className="custom-scrollbar mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">{tickets.map((ticket) => <button type="button" onClick={() => setSelectedId(ticket.id)} key={ticket.id} className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${selectedId === ticket.id ? "border-violet-400 bg-violet-500/[0.08]" : "border-white/[0.08] bg-black/20 hover:border-white/20"}`}><div className="flex items-start justify-between gap-3"><h3 className="min-w-0 truncate font-semibold text-white">{ticket.subject}</h3><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[ticket.status] || "bg-white/10 text-zinc-300"}`}>{ticket.status}</span></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-zinc-300">{ticket.category}</span><span className={`rounded-md px-2 py-1 text-xs font-medium ${PRIORITY_STYLES[ticket.priority] || "bg-white/5 text-zinc-400"}`}>{ticket.priority}</span><span className="ml-auto text-xs text-zinc-500">{ticket.createdAt}</span></div></button>)}</div>}
          {selectedTicket && <div className="fixed bottom-5 right-5 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11111A]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <h3 className="truncate text-sm font-semibold text-white">Support chat</h3>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-400">{selectedTicket.subject} · {selectedTicket.category}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close support chat" className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"><X size={16} /></button>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
              {selectedTicket.messages.length === 0 ? <p className="py-6 text-center text-xs text-zinc-500">Loading conversation...</p> : selectedTicket.messages.map((message, index) => <div key={`${message.at}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${message.from === "user" ? "bg-white/[0.05]" : "bg-violet-600/30"}`}><p>{message.text}</p><p className="mt-1 text-xs text-zinc-500">{message.at}</p></div>)}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3"><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Reply to support" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500" /><button type="submit" disabled={!messageText.trim()} aria-label="Send message" className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold disabled:opacity-40"><Send size={16} /></button></form>
          </div>}
        </div>
      </section>
    </div>
  );
}

function TicketThreadModal({ ticket, onClose, onReply, onStatusChange }) {
  const [reply, setReply] = useState("");

  const handleSend = () => {
    if (!reply.trim()) return;
    onReply(ticket.id, reply.trim());
    setReply("");
  };

  return createPortal(
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
        className="custom-scrollbar flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{ticket.subject}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[ticket.requesterRole]}`}>
                {ticket.requesterRole}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {ticket.requesterName} · {ticket.category} · Opened {ticket.createdAt}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
          {ticket.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "admin" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  msg.from === "admin" ? "bg-violet-600 text-white" : "bg-white/[0.05] text-zinc-200"
                }`}
              >
                <p>{msg.text}</p>
                <p className={`mt-1.5 text-[11px] ${msg.from === "admin" ? "text-violet-200" : "text-zinc-500"}`}>
                  {msg.at}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {["Open", "In Progress", "Resolved"].map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(ticket.id, s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  ticket.status === s
                    ? STATUS_STYLES[s]
                    : "border border-white/10 text-zinc-500 hover:border-white/20 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
          <textarea
  rows={2}
  placeholder="Write a reply..."
  value={reply}
  onChange={(e) => setReply(e.target.value)}
  className="custom-scrollbar flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
  style={{ maxHeight: "160px" }}
/>
            <button
              onClick={handleSend}
              disabled={!reply.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export default function SupportTickets({ isAdmin = false }) {
  return isAdmin ? <AdminSupportTickets /> : <UserSupportTickets />;
}

function AdminSupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Open");
  const { showToast } = useToast();

  useEffect(() => {
    api("/api/support/tickets/")
      .then((response) => setTickets((response.results || response).map(mapTicket)))
      .catch((error) => showToast({ type: "error", message: error.message }));
  }, []);

  const selected = tickets.find((t) => t.id === selectedId) || null;

  const openTicket = async (id) => {
    setSelectedId(id);
    try {
      const detail = await api(`/api/support/tickets/${id}/`);
      setTickets((previous) => previous.map((ticket) => ticket.id === id ? mapTicket(detail) : ticket));
    } catch (error) {
      showToast({ type: "error", message: error.message });
    }
  };

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (categoryFilter !== "All" && t.categoryValue !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${t.requesterName} ${t.subject} ${t.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, search, categoryFilter, statusFilter]);

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const highPriorityCount = tickets.filter((t) => t.status !== "Resolved" && t.priority === "High").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;

  const kpiCards = [
    { label: "Open", value: openCount, icon: AlertCircle, accent: "rose" },
    { label: "In Progress", value: inProgressCount, icon: Clock3, accent: "amber" },
    { label: "High Priority", value: highPriorityCount, icon: AlertCircle, accent: "violet" },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle2, accent: "emerald" },
  ];

  const KPI_ACCENTS = {
    rose: { iconBg: "bg-rose-500/10", iconText: "text-rose-400" },
    amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
    violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
    emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
  };

  const handleReply = async (id, text) => {
    try {
      const message = await api(`/api/support/tickets/${id}/messages/`, {
        method: "POST",
        body: { body: text },
      });
      setTickets((prev) => prev.map((item) => item.id === id ? { ...item, messages: [...item.messages, { from: "admin", text: message.body, at: new Date(message.created_at).toLocaleString() }], admin_response: message.body } : item));
    } catch (error) {
      showToast({ type: "error", message: error.message });
    }
  };

  const handleStatusChange = async (id, status) => {
    const apiStatus = status.toLowerCase().replaceAll(" ", "_");
    try {
      const updated = await api(`/api/support/tickets/${id}/`, {
        method: "PATCH",
        body: { status: apiStatus },
      });
      setTickets((prev) => prev.map((item) => item.id === id ? mapTicket(updated) : item));
      showToast({ type: "success", message: `Ticket marked ${status}.` });
    } catch (error) {
      showToast({ type: "error", message: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      {/* Hero */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
          Admin Panel
        </span>
        <h1 className="mt-5 text-4xl font-bold">Support Tickets</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Respond to and resolve tickets from brands, creators, and clippers.
        </p>
      </section>

      {/* KPI Cards */}
      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ label, value, icon: Icon, accent }) => {
          const a = KPI_ACCENTS[accent];
          return (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                <Icon size={17} className={a.iconText} />
              </div>
              <h3 className="mt-3 text-3xl font-bold">{value}</h3>
              <p className="mt-1 text-sm text-zinc-500">{label}</p>
            </div>
          );
        })}
      </section>

      {/* Filters */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by requester or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Queue */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tickets</h2>
              <p className="mt-1 text-sm text-zinc-400">Click a ticket to reply and update its status.</p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">{filtered.length} Results</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LifeBuoy size={48} className="mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold">No tickets here</h3>
            <p className="mt-2 text-sm text-zinc-500">No tickets match your current filters.</p>
          </div>
        ) : (
          <div className="custom-scrollbar max-h-[600px] overflow-y-auto">
            {filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket.id)}
                className="flex w-full items-center gap-4 border-b border-white/5 px-6 py-5 text-left transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-semibold text-white">{ticket.subject}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {ticket.requesterName}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${ROLE_STYLES[ticket.requesterRole]}`}>
                      {ticket.requesterRole}
                    </span>
                    {" "}· {ticket.category}
                  </p>
                </div>

                <span className="hidden shrink-0 text-xs text-zinc-500 md:block">{ticket.createdAt}</span>

                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                  {ticket.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {selected && (
          <TicketThreadModal
            ticket={selected}
            onClose={() => setSelectedId(null)}
            onReply={handleReply}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
