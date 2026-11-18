/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthGuard from "./AuthGuard";
import ErrorFallback from "../../pages/ErrorFallback";
import NotFound from "../../pages/NotFound";
import Home from "../../pages/Home";
import Signup from "../../pages/SignUp";
import Login from "../../pages/Login";
import DashboardLayout from "../Dashboard/DashboardLayout";
import ContentLoader from "../../shared/ui/ContentLoader";

/* Lazy — public / misc */
const ForgotPassword = lazy(() => import("../../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../../pages/ResetPassword"));
const AuthCallback = lazy(() => import("../../pages/AuthCallback"));
const Marketplace = lazy(() => import("../../pages/Marketplace"));
const Community = lazy(() => import("../../pages/Community/Community"));
const AllUsers = lazy(() => import("../../pages/Community/AllUsers"));
const Messages = lazy(() => import("../../pages/Messages"));
const ComingSoon = lazy(() => import("../../pages/ComingSoon"));
const About = lazy(() => import("../../pages/About"));
const PrivacyPolicy = lazy(() => import("../../pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("../../pages/TermsAndConditions"));

/* Lazy — admin */
const AdminDashboard = lazy(() => import("../../pages/Admin/Dashboard"));
const AdminSubmissionQueue = lazy(() => import("../../pages/Admin/SubmissionQueue"));
const AdminPendingApprovals = lazy(() => import("../../pages/Admin/PendingApprovals"));
const AdminPayoutApproval = lazy(() => import("../../pages/Admin/PayoutApproval"));
const AdminPayoutEligibility = lazy(() => import("../../pages/Admin/PayoutEligibility"));
const SupportTickets = lazy(() => import("../../pages/Admin/SupportTickets"));
const CampaignSubmissions = lazy(() => import("../../pages/Admin/CampaignSubmissions"));
const CampaignSubmissionDetail = lazy(() => import("../../pages/Admin/CampaignSubmissionDetail"));
const AdminClipperSubmissions = lazy(() => import("../../pages/Admin/AdminClipperSubmissions"));
const AdminSettings = lazy(() => import("../../pages/Admin/Settings"));

/* Lazy — brand */
const Dashboard = lazy(() => import("../../pages/Brand/Dashboard"));
const Campaigns = lazy(() => import("../../pages/Brand/Campaigns"));
const CampaignDetails = lazy(() => import("../../pages/Brand/CampaignDetails"));
const CreateCampaign = lazy(() => import("../../pages/Brand/CreateCampaign"));
const EditCampaign = lazy(() => import("../../pages/EditCampaign"));
const Analytics = lazy(() => import("../../pages/Brand/Analytics"));
const Budget = lazy(() => import("../../pages/Brand/Budget"));
const Payouts = lazy(() => import("../../pages/Brand/Payouts"));
const BrandWallet = lazy(() => import("../../pages/Brand/BrandWallet"));
const BrandTransactionHistory = lazy(() => import("../../pages/Brand/BrandTransactionHistory"));
const Profile = lazy(() => import("../../pages/Brand/Profile"));
const ClipperSubmissions = lazy(() => import("../../pages/Brand/ClipperSubmissions"));
const ClipDetails = lazy(() => import("../../pages/Brand/ClipDetails"));

/* Lazy — creator */
const CreatorDashboard = lazy(() => import("../../pages/Creator/Dashboard"));
const CreatorProfile = lazy(() => import("../../pages/Creator/Profile"));
const CreatorGigs = lazy(() => import("../../pages/Creator/CreatorGigs"));
const CreateGig = lazy(() => import("../../pages/Creator/CreateGig"));
const CreatorGigDetails = lazy(() => import("../../pages/Creator/CreatorGigDetails"));
const EditGig = lazy(() => import("../../pages/Creator/EditGig"));
const GigClipDetails = lazy(() => import("../../pages/Creator/GigClipDetails"));
const CreatorOpportunities = lazy(() => import("../../pages/Creator/CreatorOpportunities"));
const OpportunityDetails = lazy(() => import("../../pages/Creator/OpportunityDetails"));
const CreatorSubmissions = lazy(() => import("../../pages/Creator/CreatorSubmissions"));
const SubmissionDetails = lazy(() => import("../../pages/Creator/SubmissionDetails"));
const CreatorAnalytics = lazy(() => import("../../pages/Creator/analytics/CreatorAnalytics"));
const CreatorWallet = lazy(() => import("../../pages/Creator/CreatorWallet"));
const CreatorTransactionHistory = lazy(() => import("../../pages/Creator/TransactionHistory"));

/* Lazy — clipper */
const ClipperDashboard = lazy(() => import("../../pages/clipper/Dashboard"));
const MyGigs = lazy(() => import("../../pages/clipper/MyGigs"));
const ClipperEarnings = lazy(() => import("../../pages/clipper/ClipperEarnings"));
const ClipperAnalytics = lazy(() => import("../../pages/clipper/ClipperAnalytics"));
const MySubmissions = lazy(() => import("../../pages/clipper/MySubmissions"));
const ClipperProfile = lazy(() => import("../../pages/clipper/ClipperProfile"));
const ClipperGigDetails = lazy(() => import("../../pages/clipper/ClipperGigDetails"));
const ClipperSubmissionDetails = lazy(() => import("../../pages/clipper/ClipperSubmissionDetails"));
const TransactionHistory = lazy(() => import("../../pages/clipper/TransactionHistory"));
const Withdraw = lazy(() => import("../../pages/clipper/Withdraw"));

/* Lazy — onboarding */
const RoleSelection = lazy(() => import("../../onboarding/RoleSelection"));
const Brandonboarding = lazy(() => import("../../onboarding/Brandonboarding"));
const ClipperOnboarding = lazy(() => import("../../onboarding/Clipperonboarding"));
const CreatorOnboarding = lazy(() => import("../../onboarding/Creatoronboarding"));

function Lazy({ children }) {
  return <Suspense fallback={<ContentLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthGuard />,
    errorElement: <ErrorFallback />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "about",
        element: <Lazy><About /></Lazy>,
      },
      {
        path: "privacy",
        element: <Lazy><PrivacyPolicy /></Lazy>,
      },
      {
        path: "terms",
        element: <Lazy><TermsAndConditions /></Lazy>,
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
        element: <Lazy><ForgotPassword /></Lazy>,
      },

      {
        path: "reset-password",
        element: <Lazy><ResetPassword /></Lazy>,
      },

      {
        path: "auth/callback",
        element: <Lazy><AuthCallback /></Lazy>,
      },

      {
        path: "marketplace",
        element: <Lazy><Marketplace /></Lazy>,
      },
      {
        path: "discover",
        element: <Lazy><ComingSoon /></Lazy>,
      },
      {
        path: "community",
        element: <Lazy><Community /></Lazy>,
      },
      {
        path: "community/people",
        element: <Lazy><AllUsers /></Lazy>,
      },
      {
        path: "leaderboard",
        element: <Lazy><ComingSoon /></Lazy>,
      },
      {
        path: "blogs",
        element: <Lazy><ComingSoon /></Lazy>,
      },
      {
        path: "messages",
        element: <Lazy><Messages /></Lazy>,
      },

      /* ---------------- BRAND ---------------- */

      {
        path: "brand",
        element: <DashboardLayout role="brand" />,
        children: [
          {
            path: "dashboard",
            element: <Lazy><Dashboard /></Lazy>,
          },

          {
            path: "campaigns",
            element: <Lazy><Campaigns /></Lazy>,
          },

          {
            path: "campaigns/create",
            element: <Lazy><CreateCampaign /></Lazy>,
          },

          {
            path: "campaigns/:id",
            element: <Lazy><CampaignDetails /></Lazy>,
          },

          {
            path: "campaigns/:id/edit",
            element: <Lazy><EditCampaign /></Lazy>,
          },

          {
            path: "campaigns/:campaignId/clippers/:clipperId",
            element: <Lazy><ClipperSubmissions /></Lazy>,
          },

          {
            path: "analytics",
            element: <Lazy><Analytics /></Lazy>,
          },

          {
            path: "budget",
            element: <Lazy><Budget /></Lazy>,
          },

          {
            path: "payouts",
            element: <Lazy><Payouts /></Lazy>,
          },
          {
            path: "clips/:clipId",
            element: <Lazy><ClipDetails /></Lazy>,
          },

          {
            path: "profile",
            element: <Lazy><Profile /></Lazy>,
          },
          {
            path: "support",
            element: <Lazy><SupportTickets /></Lazy>,
          },
          {
            path: "earnings",
            element: <Lazy><BrandWallet /></Lazy>,
          },
          {
            path: "transactions",
            element: <Lazy><BrandTransactionHistory /></Lazy>,
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
            element: <Lazy><CreatorDashboard /></Lazy>,
          },
          {
            path: "gigs",
            element: <Lazy><CreatorGigs /></Lazy>,
          },
          {
            path: "gigs/create",
            element: <Lazy><CreateGig /></Lazy>,
          },
          {
            path: "gigs/:id",
            element: <Lazy><CreatorGigDetails /></Lazy>,
          },
          {
            path: "gigs/:id/edit",
            element: <Lazy><EditGig /></Lazy>,
          },
          {
            path: "gigs/:gigId/participants/:participantId",
            element: <Lazy><ClipperSubmissions /></Lazy>,
          },
          {
            path: "gigs/:gigId/participants/:participantId/clips/:submissionId",
            element: <Lazy><GigClipDetails /></Lazy>,
          },
          {
            path: "opportunities",
            element: <Lazy><CreatorOpportunities /></Lazy>,
          },
          {
            path: "opportunities/:id",
            element: <Lazy><OpportunityDetails /></Lazy>,
          },
          {
            path: "submissions",
            element: <Lazy><CreatorSubmissions /></Lazy>,
          },
          {
            path: "submissions/:id",
            element: <Lazy><SubmissionDetails /></Lazy>,
          },
          {
            path: "profile",
            element: <Lazy><CreatorProfile /></Lazy>,
          },
          {
            path: "support",
            element: <Lazy><SupportTickets /></Lazy>,
          },
          {
            path: "analytics",
            element: <Lazy><CreatorAnalytics /></Lazy>,
          },
          {
            path: "earnings",
            element: <Lazy><CreatorWallet /></Lazy>,
          },
          {
            path: "transactions",
            element: <Lazy><CreatorTransactionHistory /></Lazy>,
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
            element: <Lazy><ClipperDashboard /></Lazy>,
          },
          {
            path: "gigs",
            element: <Lazy><MyGigs /></Lazy>,
          },
          {
            path: "gigs/:id",
            element: <Lazy><ClipperGigDetails /></Lazy>,
          },
          {
            path: "gigs/:gigId/submissions/:submissionId",
            element: <Lazy><ClipperSubmissionDetails /></Lazy>,
          },
          {
            path: "earnings",
            element: <Lazy><ClipperEarnings /></Lazy>,
          },
          {
            path: "analytics",
            element: <Lazy><ClipperAnalytics /></Lazy>,
          },
          {
            path: "submissions",
            element: <Lazy><MySubmissions /></Lazy>,
          },
          {
            path: "profile",
            element: <Lazy><ClipperProfile /></Lazy>,
          },
          {
            path: "support",
            element: <Lazy><SupportTickets /></Lazy>,
          },
          {
            path: "transactions",
            element: <Lazy><TransactionHistory /></Lazy>,
          },
          {
            path: "withdraw",
            element: <Lazy><Withdraw /></Lazy>,
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
        element: <Lazy><AdminDashboard /></Lazy>,
      },
      {
        path: "dashboard",
        element: <Lazy><AdminDashboard /></Lazy>,
      },
      {
        path: "submissions",
        element: <Lazy><AdminSubmissionQueue /></Lazy>,
      },
      {
        path: "pending-approvals",
        element: <Lazy><AdminPendingApprovals /></Lazy>,
      },
      {
        path: "payout-approval",
        element: <Lazy><AdminPayoutApproval /></Lazy>,
      },
      {
        path: "payouts",
        element: <Lazy><AdminPayoutEligibility /></Lazy>,
      },
      {
        path: "support",
        element: <Lazy><SupportTickets isAdmin /></Lazy>,
      },
      {
        path: "settings",
        element: <Lazy><AdminSettings /></Lazy>,
      },
      {
        path: "campaigns",
        element: <Lazy><CampaignSubmissions /></Lazy>,
      },
      {
        path: "campaigns/:campaignId",
        element: <Lazy><CampaignSubmissionDetail /></Lazy>,
      },
      {
        path: "clippers/:username",
        element: <Lazy><AdminClipperSubmissions /></Lazy>,
      },
    ],
  },
      /* ---------------- ONBOARDING ---------------- */

      {
        path: "onboarding/role",
        element: <Lazy><RoleSelection /></Lazy>,
      },

      {
        path: "onboarding/brand",
        element: <Lazy><Brandonboarding /></Lazy>,
      },

      {
        path: "onboarding/creator",
        element: <Lazy><CreatorOnboarding /></Lazy>,
      },

      {
        path: "onboarding/clipper",
        element: <Lazy><ClipperOnboarding /></Lazy>,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);
