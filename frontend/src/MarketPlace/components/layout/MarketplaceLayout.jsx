import AppSidebar from "../../../components/navigation/AppSidebar";
import RightSidebar from "../rightSidebar/RightSidebar";
import TopNavbar from "../../../shared/navbar/TopNavbar";

export default function MarketplaceLayout({
  children,
  role = "creator",
  campaigns = [],
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      <AppSidebar
        role={role}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <main className="ml-0 lg:ml-64">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="min-w-0 flex-1">
            {children}
          </div>

          <aside className="hidden w-80 shrink-0 xl:block">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              <RightSidebar campaigns={campaigns} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}