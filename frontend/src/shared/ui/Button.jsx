import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  primary:
    "bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60",
  secondary:
    "border border-white/10 bg-transparent text-white hover:border-white/20 disabled:opacity-60",
  ghost:
    "bg-transparent text-white hover:bg-white/5 disabled:opacity-60",
  danger:
    "bg-red-500 text-white hover:bg-red-400 disabled:opacity-60",
  warning:
    "bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-60",
  success:
    "bg-green-500 text-white hover:bg-green-400 disabled:opacity-60",
  info:
    "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60",
  caution:
    "bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-60",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2",
        "disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
