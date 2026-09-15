import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useCurrentUser from "../../hooks/useCurrentUser";
import {
  Compass,
  BriefcaseBusiness,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import SidebarSection from "./SidebarSection";
import { sidebarConfig } from "./sidebarConfig";
import { clearAuthStorage } from "../../lib/api";
import ConfirmModal from "../../shared/ui/ComfirmModal";

export default function AppSidebar({ role: propRole }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  const role = String(propRole || user?.role || "").toLowerCase();
  const roleLabel = role || "guest";
  const exploreLinks = sidebarConfig.explore;
  const workspaceLinks = sidebarConfig.workspace[role] || [];

  const isExploreRoute = exploreLinks.some((link) =>
    location.pathname.startsWith(link.path)
  );

  const [openSection, setOpenSection] = useState(
    isExploreRoute ? "explore" : "workspace"
  );
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setOpenSection(isExploreRoute ? "explore" : "workspace");
  }, [location.pathname, isExploreRoute]);

  const handleLogout = () => {
    setLogoutConfirmationOpen(true);
  };

  const confirmLogout = () => {
    setLogoutConfirmationOpen(false);
    clearAuthStorage();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-white/10 bg-[#0B0B12] p-3 text-white shadow-lg md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0B0B12] transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">
              Clinq<span className="text-violet-500">.</span>
            </h1>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white md:hidden"
              aria-label="Close navigation"
            >
              <X size={22} />
            </button>
          </div>

          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
            {roleLabel}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <SidebarSection
            title="Explore"
            icon={Compass}
            links={exploreLinks}
            isOpen={openSection === "explore"}
            onToggle={() =>
              setOpenSection((prev) =>
                prev === "explore" ? null : "explore"
              )
            }
          />

          <div className="my-5 h-px bg-white/5" />

          <SidebarSection
            title="Workspace"
            icon={BriefcaseBusiness}
            links={workspaceLinks}
            isOpen={openSection === "workspace"}
            onToggle={() =>
              setOpenSection((prev) =>
                prev === "workspace" ? null : "workspace"
              )
            }
          />
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

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