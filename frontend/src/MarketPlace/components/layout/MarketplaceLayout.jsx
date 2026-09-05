import AppSidebar from "../../../components/navigation/AppSidebar";
import RightSidebar from "../rightSidebar/RightSidebar";
import TopNavbar from "../../../shared/navbar/TopNavbar";

export default function MarketplaceLayout({ children, role = "creator", campaigns = [] }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <AppSidebar />

      <main className="ml-64">
        <TopNavbar role={role} />

        {/* px-8 gives the same gap on the left (AppSidebar → content) as
            gap-8 gives on the right (content → RightSidebar) — both 2rem. */}
        <div className="flex gap-8 px-8 py-8">
          <div className="min-w-0 flex-1">
            {children}
          </div>

          <aside className="hidden xl:block w-80 shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              <RightSidebar campaigns={campaigns} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}