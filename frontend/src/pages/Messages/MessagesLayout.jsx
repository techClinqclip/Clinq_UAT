import AppSidebar from "../../components/navigation/AppSidebar";
import TopNavbar from "../../shared//navbar/TopNavbar";

// TODO: wire to your real auth/role source, same as Community/Leaderboard layouts.
export default function MessagesLayout({ children, role = "creator" }) {
  return (
    <div className="h-screen overflow-hidden bg-zinc-950">
      <AppSidebar role={role} />

      <main className="ml-64 flex h-screen flex-col">
        <TopNavbar role={role} />
        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  );
}