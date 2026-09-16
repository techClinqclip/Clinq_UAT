import { useState } from "react";
import { ChevronLeft, X } from "lucide-react";

import AppSidebar from "../../../components/navigation/AppSidebar";
import RightSidebar from "../rightSidebar/RightSidebar";
import TopNavbar from "../../../shared/navbar/TopNavbar";

export default function MarketplaceLayout({
  children,
  role = "creator",
  campaigns = [],
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-zinc-950">
      <AppSidebar />

      <main className="ml-0 w-full min-w-0 lg:ml-64">
        <TopNavbar role={role} />

        <div className="flex w-full min-w-0 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:flex-row">
          {/* Main marketplace content */}
          <div className="min-w-0 flex-1">
            {children}
          </div>

          {/* Desktop right sidebar */}
          <aside className="hidden w-full shrink-0 xl:block xl:w-80">
            <div className="sticky top-24 max-h-[calc(100dvh-6rem)] overflow-y-auto custom-scrollbar">
              <RightSidebar campaigns={campaigns} />
            </div>
          </aside>
        </div>
      </main>

      {/* =========================================================
          MOBILE SIDEBAR BACKDROP
          ========================================================= */}
      <div
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden ${
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* =========================================================
          MOBILE RIGHT DRAWER
          ========================================================= */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-dvh w-[88vw] max-w-sm flex-col overflow-hidden border-l border-white/10 bg-[#0B0B12] shadow-2xl transition-transform duration-300 ease-out xl:hidden ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        {/* Drawer header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <div>
            <p className="text-sm font-semibold text-white">Marketplace</p>
            <p className="text-xs text-zinc-500">Insights & activity</p>
          </div>

          <button
            type="button"
            onClick={closeSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close marketplace sidebar"
          >
            <X size={19} />
          </button>
        </div>

        {/* IMPORTANT:
            min-h-0 allows this area to actually scroll instead of
            getting clipped by the viewport. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
          <RightSidebar campaigns={campaigns} />
        </div>
      </aside>

      {/* =========================================================
          MOBILE DRAWER HANDLE
          ========================================================= */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className={`fixed right-0 top-1/2 z-30 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-white/10 bg-[#16161F]/95 text-zinc-400 shadow-xl backdrop-blur-xl transition-all duration-300 hover:bg-violet-600 hover:text-white xl:hidden ${
          sidebarOpen
            ? "pointer-events-none translate-x-full opacity-0"
            : "translate-x-0 opacity-100"
        }`}
        aria-label="Open marketplace sidebar"
      >
        <ChevronLeft size={17} />
      </button>
    </div>
  );
}