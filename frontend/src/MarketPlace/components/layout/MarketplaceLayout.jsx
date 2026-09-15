import AppSidebar from "../../../components/navigation/AppSidebar";
import RightSidebar from "../rightSidebar/RightSidebar";
import TopNavbar from "../../../shared/navbar/TopNavbar";

export default function MarketplaceLayout({
  children,
  role = "creator",
  campaigns = [],
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <AppSidebar />

      <main className="ml-0 lg:ml-64">
        <TopNavbar role={role} />

        <div className="flex flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:flex-row">
          
          {/* Main marketplace content */}
          <div className="min-w-0 flex-1">
            {children}
          </div>

          {/* Right sidebar */}
          <aside className="w-full shrink-0 xl:w-80">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              <RightSidebar campaigns={campaigns} />
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}