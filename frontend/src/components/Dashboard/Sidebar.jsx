import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  User,
  Search,
  Wallet,
  LogOut,
  FolderOpen,
  BarChart3,
  IndianRupee,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar({ role }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const links = {
    brand: [
      {
        name: "Dashboard",
        path: "/brand/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Campaigns",
        path: "/brand/campaigns",
        icon: Megaphone,
      },
      {
        name: "Analytics",
        path: "/brand/analytics",
        icon: Search,
      },
      {
        name: "Budget",
        path: "/brand/budget",
        icon: IndianRupee,
      },
      {
        name: "Profile",
        path: "/brand/profile",
        icon: User,
      },
    ],

    creator: [
      {
        name: "Dashboard",
        path: "/creator/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Gigs",
        path: "/creator/gigs",
        icon: Megaphone,
      },
      {
        name: "My Submissions",
        path: "/creator/submissions",
        icon: FolderOpen,
      },
      {
        name: "Analytics",
        path: "/creator/analytics",
        icon: BarChart3,
      },
      {
        name: "earnings",
        path: "/creator/earnings",
        icon: IndianRupee,
      },
      {
        name: "Profile",
        path: "/creator/profile",
        icon: User,
      },
    ],

    // clipper: [
    //   {
    //     name: "Dashboard",
    //     path: "/clipper/dashboard",
    //     icon: LayoutDashboard,
    //   },
    //   // {
    //   //   name: "Discover",
    //   //   path: "/clipper/discover",
    //   //   icon: Search,
    //   // },
    //   {
    //     name: "Earnings",
    //     path: "/clipper/earnings",
    //     icon: Wallet,
    //   },
      
    //   {
    //     name: "Profile",
    //     path: "/clipper/profile",
    //     icon: User,
    //   },
    // ],
    clipper: [
      {
        name: "Dashboard",
        path: "/clipper/dashboard",
        icon: LayoutDashboard,
      },
      // {
      //   name: "Discover",
      //   path: "/clipper/discover",
      //   icon: Search,
      // },
      {
        name: "My Submissions",
        path: "/clipper/gigs",
        icon: FolderOpen,
      },
      // {
      //   name: "My Submissions",
      //   path: "/clipper/submissions",
      //   icon: FolderOpen,
      // },
      {
        name: "Earnings",
        path: "/clipper/earnings",
        icon: Wallet,
      },
      {
        name: "Analytics",
        path: "/clipper/analytics",
        icon: BarChart3,
      },
      {
        name: "Profile",
        path: "/clipper/profile",
        icon: User,
      },
    ],
  };

  const currentLinks = links[role] || [];

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-white/10 bg-[#0B0B12] p-3 text-white shadow-lg md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0B0B12] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}

        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">
              Clinq<span className="text-violet-500">.</span>
            </h1>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white md:hidden"
              aria-label="Close navigation"
            >
              <X size={22} />
            </button>
          </div>

          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
            {role}
          </p>
        </div>

        {/* Navigation */}

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          {currentLinks.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.name}
                to={link.path}
                end
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `mb-2 flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                    isActive
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={20} />
                {link.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={20} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}