import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import ProfileHoverCard from "./ProfileHoverCard";

const POPOVER_WIDTH = 320; // matches ProfileHoverCard's w-80

export default function HoverProfileTrigger({ user, children, align = "left" }) {
  const [hovering, setHovering] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);

  if (!user) return children;

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let left = align === "right" ? rect.right - POPOVER_WIDTH : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8));
    setCoords({ top: rect.bottom + 8, left });
  };

  const handleEnter = () => {
    clearTimeout(closeTimer.current);
    updatePosition();
    setHovering(true);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setHovering(false), 120);
  };

  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}

      {hovering &&
        createPortal(
          <div
            style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 100 }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <ProfileHoverCard user={user} />
          </div>,
          document.body
        )}
    </div>
  );
}