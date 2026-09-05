// Seed conversations for the Messages page demo. Self-contained (doesn't
// import from Community/Leaderboard data) so the messaging module has no
// dependency on other pages — any page can hand it a { id, name, username,
// avatar } object and it works.

const now = Date.now();
const mins = (n) => now - n * 60 * 1000;
const hours = (n) => now - n * 60 * 60 * 1000;
const days = (n) => now - n * 24 * 60 * 60 * 1000;

export const seedConversations = {
  u2: {
    peer: {
      id: "u2",
      name: "QTT",
      username: "qualifiedtt",
      avatar: "https://i.pravatar.cc/200?img=59",
    },
    messages: [
      { id: "seed_1", senderId: "u2", text: "Hey! Saw your clip on the campaign, great work 🔥", timestamp: hours(5) },
      { id: "seed_2", senderId: "u_me", text: "Thanks! Just submitted another one for review.", timestamp: hours(4) },
      { id: "seed_3", senderId: "u2", text: "Nice, I'll check it out today.", timestamp: hours(3) },
    ],
    lastReadAt: hours(3),
  },
  u3: {
    peer: {
      id: "u3",
      name: "Tiana",
      username: "tiana.grows",
      avatar: "https://i.pravatar.cc/200?img=47",
    },
    messages: [
      { id: "seed_4", senderId: "u_me", text: "Loved the onboarding flow post, super clean.", timestamp: days(1) },
      { id: "seed_5", senderId: "u3", text: "Appreciate it! Took a few iterations to get right.", timestamp: hours(20) },
      { id: "seed_6", senderId: "u3", text: "Let me know if you want a walkthrough sometime.", timestamp: hours(19) },
    ],
    lastReadAt: hours(23), // slightly stale on purpose → shows as unread
  },
  l4: {
    peer: {
      id: "l4",
      name: "Trustmysystem",
      username: "trustmysystem",
      avatar: "https://i.pravatar.cc/200?img=51",
    },
    messages: [
      { id: "seed_7", senderId: "l4", text: "Congrats on cracking the top 10 this week 🎉", timestamp: mins(45) },
    ],
    lastReadAt: mins(50), // before the message → unread
  },

  support_team: {
    peer: {
      id: "support_team",
      name: "Clinq Support",
      username: "support",
      avatar: null,
      isSupport: true,
    },
    messages: [
      {
        id: "seed_support_1",
        senderId: "support_team",
        text: "Hey! 👋 What can we help you with today?",
        timestamp: mins(1),
      },
    ],
    lastReadAt: mins(1),
  },
};