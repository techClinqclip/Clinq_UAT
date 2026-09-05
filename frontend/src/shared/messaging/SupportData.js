// Special conversation partner for support chat. Reuses the exact same
// MessagingContext store as regular DMs — no separate system needed.
// isSupport lets QuickMessageModal render a branded badge instead of
// expecting a photo avatar.
export const SUPPORT_AGENT = {
    id: "support_team",
    name: "Clinq Support",
    username: "support",
    avatar: null,
    isSupport: true,
  };