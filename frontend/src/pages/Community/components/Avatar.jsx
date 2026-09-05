import { useState } from "react";

const RING_COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-sky-500", "bg-fuchsia-500",
];

function colorFor(seed = "") {
  const idx = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % RING_COLORS.length;
  return RING_COLORS[idx];
}

export default function Avatar({ src, name = "", size = 40, className = "" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const style = { width: size, height: size };

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorFor(name)} ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials || "?"}</span>
    </div>
  );
}