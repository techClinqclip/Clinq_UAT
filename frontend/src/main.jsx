import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";
import { router } from "./components/routes/router";
import { ToastProvider } from "./components/feedback/toast";
import { MessagingProvider } from "./shared/messaging/MessagingContext";
import { NotificationProvider } from "./shared/notifications/NotificationContext";
import { SocialProvider } from "./shared/social/SocialContext";
import ProfileModal from "./shared/social/ProfileModal";
import QuickMessageModal from "./shared/messaging/Quickmessagemodal";
import NetworkStatusBanner from "./pages/NetworkStatusBanner";



// Scroll to top on every route change
let previousPathname = router.state.location.pathname;
router.subscribe((state) => {
  if (state.location.pathname !== previousPathname) {
    previousPathname = state.location.pathname;
    window.scrollTo(0, 0);
  }
});
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NetworkStatusBanner />
    <ToastProvider>
      {/* MessagingProvider stays wrapped even with messaging "off" —
          ProfileHoverCard/ProfileModal still call useMessaging() at the
          top level (hooks can't be conditional), so the provider needs
          to exist in the tree regardless. It's inert with no UI pointing
          at it, which is exactly the point of a flag-based disable. */}
      <MessagingProvider>
        <NotificationProvider>
          <SocialProvider>
            <RouterProvider router={router} />
            <ProfileModal />
            {/* Always mounted — it renders nothing unless something calls
                openQuickMessage(). Support chat needs it available even
                with FEATURES.messaging off; individual trigger points
                (ProfileModal's Message button, hover-card quick-send)
                are what's actually gated by that flag. */}
            <QuickMessageModal />
          </SocialProvider>
        </NotificationProvider>
      </MessagingProvider>
    </ToastProvider>
  </StrictMode>
);
