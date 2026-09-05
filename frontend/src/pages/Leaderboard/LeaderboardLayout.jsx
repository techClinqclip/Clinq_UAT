import AppSidebar from "../../components/navigation/AppSidebar";
import TopNavbar from "../../shared/navbar/TopNavbar";

// TODO: wire to your real auth/role source, same as CommunityLayout.
export default function LeaderboardLayout({ children, role = "creator" }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <AppSidebar role={role} />

      <main className="ml-64">
        <TopNavbar role={role} />
        {children}
      </main>
    </div>
  );
}