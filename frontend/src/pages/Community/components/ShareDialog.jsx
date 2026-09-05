import { useState } from "react";
import { X, Copy, Check, Link2 } from "lucide-react";
import { FaXTwitter, FaWhatsapp, FaFacebook } from "react-icons/fa6";

export default function ShareDialog({ isOpen, onClose, threadId }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/community/thread/${threadId}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareTargets = [
    { icon: FaXTwitter, label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}` },
    { icon: FaWhatsapp, label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}` },
    { icon: FaFacebook, label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white">Share Post</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex justify-center gap-4">
            {shareTargets.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 text-xs text-zinc-400 transition hover:text-white"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 transition hover:bg-white/10">
                  <Icon size={18} />
                </span>
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <Link2 size={14} className="shrink-0 text-zinc-500" />
            <span className="flex-1 truncate text-xs text-zinc-400">{shareUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}