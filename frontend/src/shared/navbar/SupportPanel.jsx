import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  MessageCircle,
  Mail,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser";

// ----------------------------------------------------------------------
// Content config — edit copy here, no JSX digging required.
// GET /api/support/faqs could replace this array later if it needs to
// be editable without a redeploy.
// ----------------------------------------------------------------------
const SUPPORT_EMAIL = "support@cliqn.app";

const FAQS = [
  {
    q: "Why was my clip rejected?",
    a: "Brands review clips against their campaign brief. Common reasons: watermark/logo missing, wrong aspect ratio, or content that doesn't match the required hook. Check the rejection note on the submission for specifics.",
  },
  {
    q: "When do I get paid?",
    a: "Payouts are released once a brand approves your clip and the campaign's payout window closes — usually within 3–5 business days of approval.",
  },
  {
    q: "How long does approval take?",
    a: "Most brands review within 48 hours. If a submission has been pending longer than that, message us and we'll follow up on your behalf.",
  },
  {
    q: "Can I resubmit a rejected clip?",
    a: "Yes — fix the issue noted in the rejection and submit it again from the campaign page. Resubmissions don't count against your submission limit.",
  },
];

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm text-zinc-300 transition hover:text-white"
      >
        {faq.q}
        <ChevronDown
          size={14}
          className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-3 text-xs leading-5 text-zinc-500">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SupportPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const user = useCurrentUser();

  // Close on outside click — same pattern as NotificationBell/ProfileMenu.
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleMessageSupport() {
    const role = String(user?.role || user?.user_type || "").toLowerCase();
    const supportPath = role === "admin" ? "/admin/support" : role ? `/${role}/support` : "/login";
    navigate(supportPath);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
        aria-label="Help and support"
      >
        <Headphones size={19} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-white/10 bg-[#131316] shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-white/[0.06] p-5">
              <h3 className="text-base font-semibold text-white">Help &amp; Support</h3>
              <p className="mt-1 text-xs text-zinc-500">
                We usually reply within a few hours.
              </p>
            </div>

            {/* Primary actions */}
            <div className="space-y-2 p-4">
              <button
                onClick={handleMessageSupport}
                className="flex w-full items-center gap-3 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                <MessageCircle size={16} />
                Open Support Chat
              </button>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                <Mail size={16} />
                Email us
                <span className="ml-auto text-xs text-zinc-500">{SUPPORT_EMAIL}</span>
              </a>
            </div>

            {/* FAQs */}
            <div className="px-5 pb-2">
              <p className="pb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Common questions
              </p>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} faq={faq} />
              ))}
            </div>

            {/* Footer */}
            <a
              href="/help"
              className="flex items-center justify-center gap-1.5 border-t border-white/[0.06] py-3 text-xs font-medium text-zinc-500 transition hover:text-violet-300"
            >
              @clinq
              <ArrowUpRight size={12} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}