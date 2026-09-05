import AppSidebar from "../../components/navigation/AppSidebar";
import TopNavbar from "../../shared/navbar/TopNavbar";
import useCurrentUser from "../../hooks/useCurrentUser";

export default function CommunityLayout({ children, role }) {
  const currentUser = useCurrentUser();
  const resolvedRole = String(
    role || currentUser?.role || currentUser?.user_type || localStorage.getItem("user_type") || "creator"
  ).toLowerCase();

  return (
    <div className="min-h-screen bg-zinc-950">
      <AppSidebar role={resolvedRole} />

      <main className="ml-64">
        <TopNavbar role={resolvedRole} />
        {children}
      </main>
    </div>
  );
}