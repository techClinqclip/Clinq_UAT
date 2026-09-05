import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthGuard from "./AuthGuard";

import Home from "../../pages/Home";
import Signup from "../../pages/SignUp";
import Login from "../../pages/Login";
import ForgotPassword from "../../pages/ForgotPassword";
import ResetPassword from "../../pages/ResetPassword";
import AuthCallback from "../../pages/AuthCallback";
import Marketplace from "../../pages/Marketplace";
import Community from "../../pages/Community/Community";
import AllUsers from "../../pages/Community/AllUsers";
import Leaderboard from "../../pages/Leaderboard";
import Messages from "../../pages/Messages";
import ComingSoon from "../../pages/ComingSoon";
import About from "../../pages/About";

/* Admin */
import AdminDashboard from "../../pages/Admin/Dashboard";
import AdminSubmissionQueue from "../../pages/Admin/SubmissionQueue";
import AdminPendingApprovals from "../../pages/Admin/PendingApprovals";
import AdminPayoutEligibility from "../../pages/Admin/PayoutEligibility";
import SupportTickets from "../../pages/Admin/SupportTickets";
import CampaignSubmissions from "../../pages/Admin/CampaignSubmissions";
import CampaignSubmissionDetail from "../../pages/Admin/CampaignSubmissionDetail";
import AdminClipperSubmissions from "../../pages/Admin/AdminClipperSubmissions";
import AdminSettings from "../../pages/Admin/Settings";


/* Brand */
import Dashboard from "../../pages/Brand/Dashboard";
import Campaigns from "../../pages/Brand/Campaigns";
import CampaignDetails from "../../pages/Brand/CampaignDetails";
import CreateCampaign from "../../pages/Brand/CreateCampaign";
import EditCampaign from "../../pages/EditCampaign";
import Analytics from "../../pages/Brand/Analytics";
import Budget from "../../pages/Brand/Budget";
import Payouts from "../../pages/Brand/Payouts";
import BrandWallet from "../../pages/Brand/BrandWallet";
import BrandTransactionHistory from "../../pages/Brand/BrandTransactionHistory";
import Profile from "../../pages/Brand/Profile";
import ClipperSubmissions from "../../pages/Brand/ClipperSubmissions";
import ClipDetails from "../../pages/Brand/ClipDetails";

/* Creator */
import CreatorDashboard from "../../pages/Creator/Dashboard";
import CreatorProfile from "../../pages/Creator/Profile";
import CreatorGigs from "../../pages/Creator/CreatorGigs";
import CreateGig from "../../pages/Creator/CreateGig";
import CreatorGigDetails from "../../pages/Creator/CreatorGigDetails";
import EditGig from "../../pages/Creator/EditGig";
import CreatorOpportunities from "../../pages/Creator/CreatorOpportunities";
import OpportunityDetails from "../../pages/Creator/OpportunityDetails";
import CreatorSubmissions from "../../pages/Creator/CreatorSubmissions";
import SubmissionDetails from "../../pages/Creator/SubmissionDetails";
import CreatorSubmissionDetails from "../../pages/Creator/CreatorSubmissionDetails";
import GigClipDetails from "../../pages/Creator/GigClipDetails";
import CreatorAnalytics from "../../pages/Creator/analytics/CreatorAnalytics";
import CreatorWallet from "../../pages/Creator/CreatorWallet";
import CreatorTransactionHistory from "../../pages/Creator/TransactionHistory";
// import CreatorCampaigns from "../../pages/creator/Campaigns";
// import CreatorCampaignDetails from "../../pages/creator/CampaignDetails";
// import CreatorCreateCampaign from "../../pages/creator/CreateCampaign";
// import CreatorClippers from "../../pages/creator/Clippers";
// import CreatorPayouts from "../../pages/creator/Payouts";

/* Clipper */
import ClipperDashboard from "../../pages/clipper/Dashboard";
import MyGigs from "../../pages/clipper/MyGigs";
import ClipperEarnings from "../../pages/clipper/ClipperEarnings";
import ClipperAnalytics from "../../pages/clipper/ClipperAnalytics";
import MySubmissions from "../../pages/clipper/MySubmissions";
import ClipperProfile from "../../pages/clipper/ClipperProfile";
import ClipperGigDetails from "../../pages/clipper/ClipperGigDetails";
import ClipperSubmissionDetails from "../../pages/clipper/ClipperSubmissionDetails";
import TransactionHistory from "../../pages/clipper/TransactionHistory";
import Withdraw from "../../pages/clipper/Withdraw";

/* Shared */
import DashboardLayout from "../Dashboard/DashboardLayout";

/* Onboarding */
import RoleSelection from "../../onboarding/RoleSelection";
import Brandonboarding from "../../onboarding/Brandonboarding";
import ClipperOnboarding from "../../onboarding/Clipperonboarding";
import CreatorOnboarding from "../../onboarding/Creatoronboarding";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthGuard />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      

      {
        path: "signup",
        element: <Signup />,
      },

      {
        path: "login",
        element: <Login />,
      },

      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },

      {
        path: "reset-password",
        element: <ResetPassword />,
      },

      {
        path: "auth/callback",
        element: <AuthCallback />,
      },

      {
        path: "marketplace",
        element: <Marketplace />,
      },
      {
        path: "discover",
        element: <ComingSoon />,
      },
      {
        path: "community",
        element: <Community />,
      },
      {
        path: "community/people",
        element: <AllUsers />,
      },
      {
        path: "leaderboard",
        element: <ComingSoon />,
      },
      {
        path: "blogs",
        element: <ComingSoon />,
      },
      {
        path: "messages",
        element: <Messages />,
      },

      /* ---------------- BRAND ---------------- */

      {
        path: "brand",
        element: <DashboardLayout role="brand" />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },

          {
            path: "campaigns",
            element: <Campaigns />,
          },

          {
            path: "campaigns/create",
            element: <CreateCampaign />,
          },

          {
            path: "campaigns/:id",
            element: <CampaignDetails />,
          },

          {
            path: "campaigns/:id/edit",
            element: <EditCampaign />,
          },

          {
            path: "campaigns/:campaignId/clippers/:clipperId",
            element: <ClipperSubmissions />,
          },

          {
            path: "analytics",
            element: <Analytics />,
          },

          {
            path: "budget",
            element: <Budget />,
          },

          {
            path: "payouts",
            element: <Payouts />,
          },
          {
            path: "clips/:clipId",
            element: <ClipDetails />,
          },

          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "support",
            element: <SupportTickets />, 
          },
          {
            path: "earnings",
            element: <BrandWallet />,
          },
          {
            path: "transactions",
            element: <BrandTransactionHistory />,
          },
        ],
      },

      /* ---------------- CREATOR ---------------- */

      {
        path: "creator",
        element: <DashboardLayout role="creator" />,
        children: [
          {
            path: "dashboard",
            element: <CreatorDashboard />,
          },
          {
            path: "gigs",
            element: <CreatorGigs />,
          },
          {
            path: "gigs/create",
            element: <CreateGig />,
          },
          {
            path: "gigs/:id",
            element: <CreatorGigDetails />,
          },
          {
            path: "gigs/:id/edit",
            element: <EditGig />,
          },
          {
            path: "gigs/:gigId/participants/:participantId",
            element: <ClipperSubmissions />,
          },
          {
            path: "gigs/:gigId/participants/:participantId/clips/:submissionId",
            element: <GigClipDetails />,
          },
          {
            path: "opportunities",
            element: <CreatorOpportunities />,
          },
          {
            path: "opportunities/:id",
            element: <OpportunityDetails />,
          },
          {
            path: "submissions",
            element: <CreatorSubmissions />,
          },
          {
            path: "submissions/:id",
            element: <SubmissionDetails />,
          },
          {
            path: "profile",
            element: <CreatorProfile />,
          },
          {
            path: "support",
            element: <SupportTickets />,
          },
          {
            path: "analytics",
            element: <CreatorAnalytics />,
          },
          {
            path: "earnings",
            element: <CreatorWallet />,
          },
          {
            path: "transactions",
            element: <CreatorTransactionHistory />,
          },
        ],
      },

      /* ---------------- CLIPPER ---------------- */

      {
        path: "clipper",
        element: <DashboardLayout role="clipper" />,
        children: [
          {
            path: "dashboard",
            element: <ClipperDashboard />,
          },
          {
            path: "gigs",
            element: <MyGigs />,
          },
          {
            path: "gigs/:id",
            element: <ClipperGigDetails />,
          },
          {
            path: "gigs/:gigId/submissions/:submissionId",
            element: <ClipperSubmissionDetails />,
          },
          {
            path: "earnings",
            element: <ClipperEarnings />,
          },
          {
            path: "analytics",
            element: <ClipperAnalytics />,
          },
          {
            path: "submissions",
            element: <MySubmissions />,
          },
          {
            path: "profile",
            element: <ClipperProfile />,
          },
          {
            path: "support",
            element: <SupportTickets />,
          },
          {
            path: "transactions",
            element: <TransactionHistory />,
          },
          {
            path: "withdraw",
            element: <Withdraw />,
          },
        ],
      },

  /* ---------------- ADMIN ---------------- */
  {
    path: "admin",
    element: <DashboardLayout role="admin" />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "submissions",
        element: <AdminSubmissionQueue />,
      },
      {
        path: "pending-approvals",
        element: <AdminPendingApprovals />,
      },
      {
        path: "payouts",
        element: <AdminPayoutEligibility />,
      },
      {
        path: "support",
        element: <SupportTickets isAdmin />,
      },
      {
        path: "settings",
        element: <AdminSettings />,
      },
      {
        path: "campaigns",
        element: <CampaignSubmissions />,
      },
      {
        path: "campaigns/:campaignId",
        element: <CampaignSubmissionDetail />,
      },
      {
        path: "clippers/:username",
        element: <AdminClipperSubmissions />,
      },
    ],
  },
      /* ---------------- ONBOARDING ---------------- */

      {
        path: "onboarding/role",
        element: <RoleSelection />,
      },

      {
        path: "onboarding/brand",
        element: <Brandonboarding />,
      },

      {
        path: "onboarding/creator",
        element: <CreatorOnboarding />,
      },

      {
        path: "onboarding/clipper",
        element: <ClipperOnboarding/>,
      },
      {
        path: "*",
        element: <RoleSelection />,
      },
    ],
  },
]);