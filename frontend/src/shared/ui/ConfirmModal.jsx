import { useEffect, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

const COLORS = {
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-400",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
  },
};

const CONFIRM_VARIANT = {
  red: "danger",
  yellow: "warning",
  green: "success",
  violet: "primary",
  blue: "info",
  amber: "caution",
};

export default function ConfirmModal({
  open,
  title,
  description,
  icon: Icon,
  color = "violet",
  iconColor,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  loadingText = "Please wait...",
  onCancel,
  onConfirm,
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  const theme = COLORS[iconColor ?? color] ?? COLORS.violet;

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      closeOnBackdrop={!loading}
    >
      {Icon && (
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${theme.bg} -mt-1 mb-3`}>
          <Icon size={20} className={theme.text} />
        </div>
      )}

      {description && (
        <p className="leading-6 text-zinc-400">{description}</p>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          disabled={loading}
          onClick={onCancel}
        >
          {cancelText}
        </Button>

        <Button
          variant={CONFIRM_VARIANT[color] ?? "primary"}
          size="md"
          className="flex-1"
          disabled={!ready}
          loading={loading}
          onClick={onConfirm}
        >
          {loading ? loadingText : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
