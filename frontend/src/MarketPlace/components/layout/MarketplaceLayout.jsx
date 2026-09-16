import AppSidebar from "../../../components/navigation/AppSidebar";
import RightSidebar from "../rightSidebar/RightSidebar";
import TopNavbar from "../../../shared/navbar/TopNavbar";

export default function MarketplaceLayout({
  children,
  role = "creator",
  campaigns = [],
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950">
      <AppSidebar />

      <main className="min-w-0 lg:ml-64">
        <TopNavbar role={role} />

        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid min-w-0 grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            
            {/* Main marketplace content */}
            <div className="min-w-0">
              {children}
            </div>

            {/* Desktop right sidebar */}
            <aside className="hidden min-w-0 xl:block">
              <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
                <RightSidebar campaigns={campaigns} />
              </div>
            </aside>

          </div>
        </div>
      </main>
    </div>
  );
}