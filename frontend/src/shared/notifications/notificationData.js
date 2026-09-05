const now = Date.now();
const mins = (n) => now - n * 60 * 1000;
const hours = (n) => now - n * 60 * 60 * 1000;
const days = (n) => now - n * 24 * 60 * 60 * 1000;

export const seedNotifications = [
  {
    id: "n1",
    type: "like",
    actor: { name: "QTT", avatar: "https://i.pravatar.cc/200?img=59" },
    text: "liked your post in Townhall",
    timestamp: mins(12),
    read: false,
  },
  {
    id: "n2",
    type: "submission",
    actor: { name: "Clinq", avatar: null },
    text: "Your clip submission was approved 🎉",
    timestamp: hours(2),
    read: false,
  },
  {
    id: "n3",
    type: "follow",
    actor: { name: "Tiana", avatar: "https://i.pravatar.cc/200?img=47" },
    text: "started following you",
    timestamp: hours(6),
    read: false,
  },
  {
    id: "n4",
    type: "rank",
    actor: { name: "Clinq", avatar: null },
    text: "You climbed into the Weekly Top 20 🏆",
    timestamp: days(1),
    read: true,
  },
  {
    id: "n5",
    type: "comment",
    actor: { name: "Trustmysystem", avatar: "https://i.pravatar.cc/200?img=51" },
    text: "commented on your thread",
    timestamp: days(2),
    read: true,
  },
];