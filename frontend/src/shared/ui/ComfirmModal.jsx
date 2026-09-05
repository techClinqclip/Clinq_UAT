import { Loader2, X } from "lucide-react";

const COLORS = {
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    button: "bg-red-500 hover:bg-red-400",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    button: "bg-yellow-500 hover:bg-yellow-400 text-black",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    button: "bg-green-500 hover:bg-green-400",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    button: "bg-violet-600 hover:bg-violet-500",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    button: "bg-blue-600 hover:bg-blue-500",
  },
};

export default function ConfirmModal({
  open,
  title,
  description,
  icon: Icon,
  color = "violet",
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  const theme = COLORS[color] || COLORS.violet;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11111A] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${theme.bg}`}>
            {Icon && <Icon size={20} className={theme.text} />}
          </div>

          <button
            onClick={onCancel}
            disabled={loading}
            className="text-zinc-500 transition hover:text-white disabled:cursor-not-allowed"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="mt-5 text-xl font-bold text-white">{title}</h2>

        <p className="mt-2 leading-6 text-zinc-400">{description}</p>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 py-2.5 font-medium text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}