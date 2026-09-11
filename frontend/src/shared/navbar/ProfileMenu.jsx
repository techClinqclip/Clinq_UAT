import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser";
import { clearAuthStorage } from "../../lib/api";
import ConfirmModal from "../ui/ComfirmModal";

const ROLE_BADGE = {
  creator: "bg-violet-500/10 text-violet-300",
  brand: "bg-amber-500/10 text-amber-300",
  clipper: "bg-emerald-500/10 text-emerald-300",
};

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function UserAvatar({ user, size = 32 }) {
  const style = { width: size, height: size };
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} style={style} className="rounded-full object-cover" />;
  }
  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-semibold text-white"
    >
      <span style={{ fontSize: size * 0.4 }}>{initials(user.name)}</span>
    </div>
  );
}

export default function ProfileMenu() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    setLogoutConfirmationOpen(true);
  };

  const confirmLogout = () => {
    setLogoutConfirmationOpen(false);
    clearAuthStorage();
    navigate("/login", { replace: true });
  };

  return (
    <>
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-white/5"
      >
        <UserAvatar user={user} size={32} />
        <ChevronDown size={14} className={`text-zinc-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#15151F] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <UserAvatar user={user} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${ROLE_BADGE[user.role] || "bg-white/10 text-zinc-300"}`}>
                {user.role}
              </span>
            </div>
          </div>

          <div className="p-1.5">
            <Link
              to={`/${user.role}/profile`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <Settings size={15} />
              Settings
            </Link>
          </div>

          <div className="border-t border-white/10 p-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
      <ConfirmModal
        open={logoutConfirmationOpen}
        title="Log out?"
        description="Are you sure you want to log out? You will need to sign in again to continue."
        icon={LogOut}
        color="red"
        confirmText="Log out"
        onCancel={() => setLogoutConfirmationOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}
