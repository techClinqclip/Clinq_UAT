import { useState } from "react";
import { PanelRight, X } from "lucide-react";
import AppSidebar from "../../../components/navigation/AppSidebar";
import RightSidebar from "../rightSidebar/RightSidebar";
import TopNavbar from "../../../shared/navbar/TopNavbar";
export default function MarketplaceLayout({
  children,
  role,
  campaigns = [],
  loading = false,
  onFilterChange,
  activeCategory = "all",
}) {
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950">
      <AppSidebar role={role} />

      {/* Main application area */}
      <main className="min-h-screen md:ml-64">
        <TopNavbar role={role} />

        <div className="relative">
          {/* =========================================================
              DESKTOP
              Right sidebar remains sticky while main content scrolls.
          ========================================================= */}
          <div className="hidden xl:block">
            <aside className="fixed right-0 top-16 bottom-0 z-30 w-80 border-l border-white/5 bg-surface-1">
              <div className="h-full overflow-y-auto px-4 py-6 custom-scrollbar">
                <RightSidebar campaigns={campaigns} onFilterChange={onFilterChange} activeCategory={activeCategory} />
              </div>
            </aside>
          </div>

          {/* =========================================================
              MAIN CONTENT
              On desktop, reserve ONLY the actual sidebar width.
              No artificial huge gap.
          ========================================================= */}
          <div className="w-full px-3 pb-5 pt-20 sm:px-6 sm:pb-8 md:pt-24 lg:px-8 xl:pr-[21rem]">
            <div className="min-w-0">
              {/* Inline insights button — replaces the fixed mid-right handle on sub-xl screens */}
              <div className="mb-4 flex justify-end xl:hidden">
                <button
                  type="button"
                  onClick={() => setRightSidebarOpen(true)}
                  aria-label="Open marketplace insights"
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-3/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur transition hover:border-white/20 hover:text-white"
                >
                  <PanelRight size={13} />
                  Insights
                </button>
              </div>
              {children}
            </div>
          </div>

          {/* =========================================================
              MOBILE RIGHT SIDEBAR DRAWER
          ========================================================= */}
          {rightSidebarOpen && (
            <div className="fixed inset-0 z-[120] xl:hidden">
              {/* Backdrop */}
              <button
                type="button"
                aria-label="Close marketplace sidebar"
                onClick={() => setRightSidebarOpen(false)}
                className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              />

              {/* Drawer */}
              <aside className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-[380px] flex-col border-l border-white/10 bg-surface-1 shadow-2xl sm:w-[min(88vw,380px)]">
                {/* Drawer header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Marketplace
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Insights &amp; activity
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRightSidebarOpen(false)}
                    aria-label="Close marketplace sidebar"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer content */}
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] custom-scrollbar">
                <RightSidebar campaigns={campaigns} loading={loading} onFilterChange={onFilterChange} activeCategory={activeCategory} />
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
