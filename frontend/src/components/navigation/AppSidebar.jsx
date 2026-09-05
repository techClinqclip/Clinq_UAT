import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useCurrentUser from "../../hooks/useCurrentUser";
import { Compass, BriefcaseBusiness, LogOut } from "lucide-react";

import SidebarSection from "./SidebarSection";
import { sidebarConfig } from "./sidebarConfig";
import { clearAuthStorage } from "../../lib/api";

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

  useEffect(() => {
    setOpenSection(isExploreRoute ? "explore" : "workspace");
  }, [location.pathname, isExploreRoute]);

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0B0B12]">
      <div className="border-b border-white/10 p-6">
        <h1 className="text-3xl font-bold text-white">
          Clinq<span className="text-violet-500">.</span>
        </h1>

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
  );
}