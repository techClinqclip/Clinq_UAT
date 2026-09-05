// v1: messaging is fully built (context, hover-card quick-send, profile
// "Message" button, navbar icon, the full /messages page) but hidden.
// Flip this to true to bring all of it back — every place that checks
// this flag is listed below, nothing else needs to change:
//
//   - src/shared/navbar/TopNavbar.jsx      → messages icon in the navbar
//   - src/shared/social/ProfileHoverCard.jsx → inline "Send message" box
//   - src/shared/social/ProfileModal.jsx   → "Message" button
//   - src/main.jsx                          → <QuickMessageModal /> render
//   - your router file                      → the /messages route itself
//     (this one isn't flag-driven — see the note below)
export const FEATURES = {
    messaging: false,
  };