import {
  LayoutDashboard,
  Megaphone,
  User,
  Search,
  Wallet,
  FolderOpen,
  BarChart3,
  Store,
  Users,
  Trophy,
  BookOpen,
  IndianRupee,
  ClipboardCheck,
  CircleDollarSign,
  LifeBuoy,
  Settings,
} from "lucide-react";

export const sidebarConfig = {
  explore: [
    {
      name: "Marketplace",
      path: "/marketplace",
      icon: Store,
    },
    {
      name: "Community",
      path: "/community",
      icon: Users,
    },
    {
      name: "Leaderboard",
      path: "/leaderboard",
      icon: Trophy,
    },
    {
      name: "Blogs",
      path: "/blogs",
      icon: BookOpen,
    },
  ],

  workspace: {
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
        icon: BarChart3,
      },
      {
        name: "Wallet",
        path: "/brand/earnings",
        icon: IndianRupee,
      },
      {
        name: "Profile",
        path: "/brand/profile",
        icon: User,
      },
      {
        name: "Support",
        path: "/brand/support",
        icon: LifeBuoy,
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
        name: "Wallet",
        path: "/creator/earnings",
        icon: IndianRupee,
      },
      {
        name: "Profile",
        path: "/creator/profile",
        icon: User,
      },
      {
        name: "Support",
        path: "/creator/support",
        icon: LifeBuoy,
      },
    ],

    clipper: [
      {
        name: "Dashboard",
        path: "/clipper/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "My Submissions",
        path: "/clipper/gigs",
        icon: FolderOpen,
      },
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
      {
        name: "Support",
        path: "/clipper/support",
        icon: LifeBuoy,
      },
    ],
    // Mirrors the four sections from the Admin Panel spec sheet
    admin: [
      {
        name: "Overview",
        path: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Submission Queue",
        path: "/admin/submissions",
        icon: ClipboardCheck,
      },
      {
        name: "Pending Amt. Approval",
        path: "/admin/pending-approvals",
        icon: CircleDollarSign,
      },
      {
        name: "Support Tickets",
        path: "/admin/support",
        icon: LifeBuoy,
      },
      {
        name: "Settings",
        path: "/admin/settings",
        icon: Settings,
      },
    ],
  },
};