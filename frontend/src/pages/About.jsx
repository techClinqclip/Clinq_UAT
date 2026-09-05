import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Wallet,
  ShieldCheck,
  Zap,
  Mail,
  MapPin,
  ArrowRight,
  ArrowDown,
  Scissors,
  Video,
  Building2,
} from "lucide-react";
import { FaInstagram, FaYoutube, FaXTwitter } from "react-icons/fa6";
import Navbar from "../components/Hero/Navbar";
import Footer from "../components/Footer/Footer";

const CONTACT_EMAIL = "hello@clinq.co";
const SOCIAL_LINKS = {
  instagram: "#",
  youtube: "#",
  twitter: "#",
};

const LOOP_NODES = [
  {
    key: "brand",
    label: "Brand posts a campaign",
    detail: "Budget, brief, and reward per clip, live in minutes.",
    icon: Building2,
    color: "cyan",
  },
  {
    key: "clip",
    label: "Creators & clippers submit",
    detail: "Cut, publish, and drop the link for review.",
    icon: Scissors,
    color: "violet",
  },
  {
    key: "payout",
    label: "Approved work gets paid",
    detail: "Every accepted submission earns its reward, automatically.",
    icon: Wallet,
    color: "amber",
  },
];

const ROLE_ACCENTS = {
  cyan: {
    text: "text-cyan-400",
    ring: "ring-cyan-400/30",
    bg: "bg-cyan-500/10",
    glow: "shadow-[0_0_40px_rgba(34,211,238,.25)]",
    stroke: "#22d3ee",
  },
  violet: {
    text: "text-violet-400",
    ring: "ring-violet-400/30",
    bg: "bg-violet-500/10",
    glow: "shadow-[0_0_40px_rgba(167,139,250,.25)]",
    stroke: "#a78bfa",
  },
  amber: {
    text: "text-amber-400",
    ring: "ring-amber-400/30",
    bg: "bg-amber-500/10",
    glow: "shadow-[0_0_40px_rgba(251,191,36,.25)]",
    stroke: "#fbbf24",
  },
};

const VALUES = [
  {
    icon: Zap,
    title: "Fast, not fussy",
    body: "Campaigns go live in minutes. Submissions get reviewed, not left waiting.",
  },
  {
    icon: ShieldCheck,
    title: "Payouts you can trust",
    body: "Every approved clip pays out on the terms the campaign promised, no surprises.",
  },
  {
    icon: Sparkles,
    title: "Room to be good at this",
    body: "Whether you're editing, publishing, or funding the work, Clinq is built around what you're actually good at.",
  },
];

const ROLE_CARDS = [
  {
    role: "clipper",
    title: "I'm a Clipper",
    body: "Turn footage into fast, punchy clips. Get paid per approved submission.",
    icon: Scissors,
    accent: "amber",
  },
  {
    role: "creator",
    title: "I'm a Creator",
    body: "Bring your audience and your channels. Match with campaigns that fit your niche.",
    icon: Video,
    accent: "violet",
  },
  {
    role: "brand",
    title: "I'm a Brand",
    body: "Launch campaigns, set the reward, and let a marketplace of editors do the rest.",
    icon: Building2,
    accent: "cyan",
  },
];

function FlowLine({ from, to, color, reduceMotion, delay = 0 }) {
  return (
    <motion.line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      strokeWidth="2"
      strokeDasharray="6 10"
      strokeLinecap="round"
      opacity={0.55}
      animate={reduceMotion ? {} : { strokeDashoffset: [0, -32] }}
      transition={
        reduceMotion
          ? {}
          : { duration: 1.6, repeat: Infinity, ease: "linear", delay }
      }
    />
  );
}

export default function About() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const positions = {
    brand: { x: 250, y: 46 },
    clip: { x: 440, y: 360 },
    payout: { x: 60, y: 360 },
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Navbar />

      <section className="relative overflow-hidden px-6 pb-24 pt-40">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[150px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative mx-auto max-w-4xl text-center"
        >
          <div className="mb-7 inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 backdrop-blur-md">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
              About Clinq
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] text-white sm:text-6xl">
            Content is work.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent">
              We built a place to get paid for it.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Clinq connects brands who need content with the creators and clippers who can
            make it. A straightforward marketplace where campaigns get funded, clips get
            made, and every approved submission gets paid.
          </p>
        </motion.div>
      </section>

      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
              How it actually works
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">The loop</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Three roles, one cycle. It runs the same way every time.
            </p>
          </div>

          <div className="relative mx-auto mt-14 hidden max-w-lg md:block">
            <svg viewBox="0 0 500 440" className="w-full">
              <FlowLine
                from={positions.brand}
                to={positions.clip}
                color={ROLE_ACCENTS.cyan.stroke}
                reduceMotion={reduceMotion}
                delay={0}
              />
              <FlowLine
                from={positions.clip}
                to={positions.payout}
                color={ROLE_ACCENTS.violet.stroke}
                reduceMotion={reduceMotion}
                delay={0.5}
              />
              <FlowLine
                from={positions.payout}
                to={positions.brand}
                color={ROLE_ACCENTS.amber.stroke}
                reduceMotion={reduceMotion}
                delay={1}
              />
            </svg>

            {LOOP_NODES.map((node, i) => {
              const pos = positions[node.key];
              const a = ROLE_ACCENTS[node.color];
              const Icon = node.icon;
              return (
                <motion.div
                  key={node.key}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="absolute w-44 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${(pos.x / 500) * 100}%`, top: `${(pos.y / 440) * 100}%` }}
                >
                  <div
                    className={`rounded-2xl border border-white/10 bg-[#12121A]/90 p-4 text-center ring-1 backdrop-blur-md ${a.ring} ${a.glow}`}
                  >
                    <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${a.bg}`}>
                      <Icon size={17} className={a.text} />
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-white">{node.label}</p>
                    <p className="mt-1 text-[11px] leading-4 text-zinc-500">{node.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3 md:hidden">
            {LOOP_NODES.map((node, i) => {
              const a = ROLE_ACCENTS[node.color];
              const Icon = node.icon;
              return (
                <div key={node.key} className="w-full max-w-xs">
                  <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ring-1 ${a.ring}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.bg}`}>
                        <Icon size={17} className={a.text} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{node.label}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{node.detail}</p>
                      </div>
                    </div>
                  </div>
                  {i < LOOP_NODES.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown size={16} className="text-zinc-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
              What we care about
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Built around the work, not around us
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                  <Icon size={18} className="text-violet-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
              Find your place in the loop
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Where do you fit?</h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {ROLE_CARDS.map(({ role, title, body, icon: Icon, accent }, i) => {
              const a = ROLE_ACCENTS[accent];
              return (
                <motion.div
                  key={role}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Link
                    to={`/signup?role=${role}`}
                    className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.bg}`}>
                      <Icon size={18} className={a.text} />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-zinc-400">{body}</p>
                    <span className={`mt-4 flex items-center gap-1.5 text-sm font-medium ${a.text}`}>
                      Get started
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-white/[0.02] to-transparent p-8 sm:p-10"
          >
            <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Get in touch</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                  Questions about a campaign, a payout, or just want to say hi, we're around.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
                  <MapPin size={15} className="text-violet-400" />
                  Based in India, working with creators everywhere.
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                  <Mail size={15} />
                  {CONTACT_EMAIL}
                </a>

                <div className="flex items-center gap-3">
                  <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-violet-400 hover:text-white" aria-label="Instagram">
                    <FaInstagram size={15} />
                  </a>
                  <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-violet-400 hover:text-white" aria-label="YouTube">
                    <FaYoutube size={15} />
                  </a>
                  <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-violet-400 hover:text-white" aria-label="X / Twitter">
                    <FaXTwitter size={15} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
