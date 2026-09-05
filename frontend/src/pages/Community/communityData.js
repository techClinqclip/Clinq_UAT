// Mock data layer for the Community page.
// Swap these arrays for real API calls later — every component here
// consumes them as plain data, so wiring a backend is a data-source
// swap, not a component rewrite.

export const currentUser = {
  id: "u_me",
  name: "You",
  username: "you",
  avatar: "https://i.pravatar.cc/200?img=68",
};

export const users = [
  {
    id: "u1",
    name: "Brian Delgadillo",
    username: "briandelgadillo",
    avatar: null, // null → falls back to initials avatar
    bio: "No description",
    followedByPreview: [
      "https://i.pravatar.cc/100?img=11",
      "https://i.pravatar.cc/100?img=22",
      "https://i.pravatar.cc/100?img=33",
    ],
    followedByCount: 46,
    followers: 1204,
    following: 318,
    joined: "Mar 2025",
    verified: true,
    cover: null,
    tagline: null,
    tabs: {
      created: [],
      joined: [],
      reviews: [],
    },
  },
  {
    id: "u2",
    name: "QTT",
    username: "qualifiedtt",
    avatar: "https://i.pravatar.cc/200?img=59",
    bio: "Operations Mngr. → Clip Labs 🚀\n9B+ Views; 100K+ Clips Generated (YouTube, TikTok, Instagram)\n— Build your legacy before the world catches up",
    tagline: "Clipping • Brand Growth • Success-management",
    followedByPreview: [
      "https://i.pravatar.cc/100?img=15",
      "https://i.pravatar.cc/100?img=26",
    ],
    followedByCount: 43110,
    followers: 43110,
    following: 2597,
    joined: "Feb 2025",
    verified: true,
    cover:
      "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1200&q=80",
    tabs: {
      created: [
        { id: "c1", title: "Clip Labs", subtitle: "Creative And Content Creation Marketplace", members: "131.6K", rating: 4.7, reviews: 231 },
        { id: "c2", title: "Video Clipping Agency", subtitle: "🚀", members: "1.5K" },
        { id: "c3", title: "Clip Labs | Workforce", subtitle: "Clipping Gig", members: "522", rating: 5.0, reviews: 6 },
      ],
      joined: [],
      reviews: [],
    },
  },
  {
    id: "u3",
    name: "Tiana",
    username: "tiana.grows",
    avatar: "https://i.pravatar.cc/200?img=47",
    bio: "Helping creators build on Whop-style communities.",
    followedByPreview: [],
    followedByCount: 0,
    followers: 8900,
    following: 210,
    joined: "Jan 2025",
    verified: false,
    cover: null,
    tagline: "Creator of Whop University + 17 more",
    tabs: { created: [], joined: [], reviews: [] },
  },
  {
    id: "u4",
    name: "Trustmysystem",
    username: "trustmysystem",
    avatar: "https://i.pravatar.cc/200?img=51",
    bio: "Trading systems that actually work.",
    followedByPreview: [],
    followedByCount: 0,
    followers: 15200,
    following: 90,
    joined: "Nov 2024",
    verified: true,
    cover: null,
    tagline: "Creator of Trust My System + 2 more",
    tabs: { created: [], joined: [], reviews: [] },
  },
  {
    id: "u5",
    name: "Steven Schwartz",
    username: "stevenschwartz",
    avatar: "https://i.pravatar.cc/200?img=13",
    bio: "AI tools for creators.",
    followedByPreview: [],
    followedByCount: 0,
    followers: 62000,
    following: 512,
    joined: "May 2024",
    verified: true,
    cover: null,
    tagline: "Creator of Whop AI + 40 more",
    tabs: { created: [], joined: [], reviews: [] },
  },
];

export const popularUsers = [
  { userId: "u2", tagline: "Creator of Clip Labs + 2 more" },
  { userId: "u3", tagline: "Creator of Whop University + 17 more" },
  { userId: "u4", tagline: "Creator of Trust My System + 2 more" },
  { userId: "u5", tagline: "Creator of Whop AI + 40 more" },
];

export const threads = [
  {
    id: "t1",
    userId: "u1",
    source: { label: "The Tool Bundle", url: "#" },
    sourceType: "Public forum",
    timestamp: "13h",
    article:
      "Pipiads, PPSpy, or Adspy — which one are you actually paying for?\n\nPipiads ($260) owns TikTok ads, PPSpy ($299) shows real Shopify store revenue, Adspy ($149) dominates Facebook — but $708/mo for all three is insane for most people. Which one made the cut for you?\n\nVote below 👇",
    media: null,
    poll: {
      question: "Which tool actually earns its spot in your stack?",
      options: [
        { id: "p1", label: "Pipiads", votes: 42 },
        { id: "p2", label: "PPSpy", votes: 18 },
        { id: "p3", label: "Adspy", votes: 27 },
      ],
    },
    likes: 214,
    liked: false,
    comments: 38,
    views: 12400,
  },
  {
    id: "t2",
    userId: "u3",
    source: null,
    timestamp: "5h",
    article:
      "Shipped a new onboarding flow for Whop University this week — cut signup friction by half. Small UX changes compound fast when you're at scale.",
    media: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    ],
    poll: null,
    likes: 96,
    liked: true,
    comments: 12,
    views: 4210,
  },
  {
    id: "t3",
    userId: "u4",
    source: { label: "Trust My System", url: "#" },
    sourceType: "Private group",
    timestamp: "1d",
    article:
      "Backtested the new entry model against 3 years of data. Win rate held at 61% out of sample — sharing the full breakdown in the group later today.",
    media: null,
    poll: null,
    likes: 341,
    liked: false,
    comments: 54,
    views: 20100,
  },
];

// Mock comments, keyed by thread id. Seeded for a couple threads so the
// Comment Modal has something to show out of the box.
export const initialComments = {
  t1: [
    { id: "c_t1_1", userId: "u3", text: "PPSpy's Shopify data alone is worth it for me.", timestamp: Date.now() - 1000 * 60 * 60 * 5 },
    { id: "c_t1_2", userId: "u4", text: "Went all in on Adspy, Facebook is still where my traffic converts.", timestamp: Date.now() - 1000 * 60 * 60 * 3 },
    { id: "c_t1_3", userId: "u5", text: "$708/mo for all three is wild lol, ToolSuite bundle is the move.", timestamp: Date.now() - 1000 * 60 * 30 },
  ],
  t3: [
    { id: "c_t3_1", userId: "u1", text: "61% win rate out of sample is solid, curious about the drawdown.", timestamp: Date.now() - 1000 * 60 * 60 * 10 },
  ],
};