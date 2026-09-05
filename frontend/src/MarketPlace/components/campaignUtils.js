export const ACCENTS = {
    violet: {
      text: "text-violet-400",
      iconBg: "bg-violet-500/10",
      cover: "from-violet-500/25 via-violet-500/5 to-transparent",
      border: "hover:border-violet-500/50",
      glow: "hover:shadow-violet-500/20",
      bar: "from-violet-500 to-fuchsia-400",
      solidBtn: "bg-violet-600 hover:bg-violet-500",
      chip: "bg-violet-500/10 text-violet-300",
      ring: "ring-violet-500/40",
    },
    emerald: {
      text: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
      cover: "from-emerald-500/25 via-emerald-500/5 to-transparent",
      border: "hover:border-emerald-500/50",
      glow: "hover:shadow-emerald-500/20",
      bar: "from-emerald-500 to-teal-400",
      solidBtn: "bg-emerald-600 hover:bg-emerald-500",
      chip: "bg-emerald-500/10 text-emerald-300",
      ring: "ring-emerald-500/40",
    },
    amber: {
      text: "text-amber-400",
      iconBg: "bg-amber-500/10",
      cover: "from-amber-500/25 via-amber-500/5 to-transparent",
      border: "hover:border-amber-500/50",
      glow: "hover:shadow-amber-500/20",
      bar: "from-amber-500 to-orange-400",
      solidBtn: "bg-amber-500 hover:bg-amber-400",
      chip: "bg-amber-500/10 text-amber-300",
      ring: "ring-amber-500/40",
    },
  };
  
  export const formatCompact = (n) =>
    new Intl.NumberFormat("en-IN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  
  export const formatMoney = (n) => `₹${formatCompact(n)}`;