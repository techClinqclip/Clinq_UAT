import { Outlet } from "react-router-dom";
import AppSidebar from "../navigation/AppSidebar";
import TopNavbar from "../../shared/navbar/TopNavbar";

export default function DashboardLayout({ role }) {
  return (
    <div className="min-h-screen bg-[#07070B]">
      <AppSidebar role={role} />

      <main className="ml-0 min-h-screen md:ml-64">
        <TopNavbar />

        <div className="px-6 py-8 pt-24 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}