// Mock data layer for the Leaderboard page.
// Each entry carries a score per time period so the Weekly / Monthly / Overall
// filter genuinely re-sorts the board instead of just relabeling it.
// Swap `entries` for a real API response later — every component here
// consumes plain objects with this shape.

export const currentUser = {
    id: "u_me",
    name: "You",
    username: "you",
    avatar: "https://i.pravatar.cc/200?img=68",
    role: "Clipper",
    bio: "Building my way up the board.",
    followers: 340,
    joined: "Jun 2025",
    verified: false,
    scores: { weekly: 420, monthly: 1650, overall: 6200 },
  };
  
  export const entries = [
    { id: "l1", name: "QTT", username: "qualifiedtt", avatar: "https://i.pravatar.cc/200?img=59", role: "Clipper", bio: "Operations Mngr. → Clip Labs 🚀", followers: 43110, joined: "Feb 2025", verified: true, scores: { weekly: 4200, monthly: 38500, overall: 198000 } },
    { id: "l2", name: "Steven Schwartz", username: "stevenschwartz", avatar: "https://i.pravatar.cc/200?img=13", role: "Brand", bio: "AI tools for creators.", followers: 62000, joined: "May 2024", verified: true, scores: { weekly: 3800, monthly: 41200, overall: 189500 } },
    { id: "l3", name: "Tiana", username: "tiana.grows", avatar: "https://i.pravatar.cc/200?img=47", role: "Creator", bio: "Helping creators build on Whop-style communities.", followers: 8900, joined: "Jan 2025", verified: false, scores: { weekly: 5100, monthly: 29800, overall: 176200 } },
    { id: "l4", name: "Trustmysystem", username: "trustmysystem", avatar: "https://i.pravatar.cc/200?img=51", role: "Brand", bio: "Trading systems that actually work.", followers: 15200, joined: "Nov 2024", verified: true, scores: { weekly: 2900, monthly: 25600, overall: 164800 } },
    { id: "l5", name: "Laura Egocheaga", username: "lauraviral", avatar: "https://i.pravatar.cc/200?img=44", role: "Creator", bio: "Creator of Viral Growth Media.", followers: 22100, joined: "Aug 2024", verified: true, scores: { weekly: 4700, monthly: 22100, overall: 152300 } },
    { id: "l6", name: "Manasseh Cole", username: "manassehc", avatar: "https://i.pravatar.cc/200?img=21", role: "Clipper", bio: "Full-time clipper, part-time chaos.", followers: 9400, joined: "Sep 2025", verified: false, scores: { weekly: 3300, monthly: 19700, overall: 141900 } },
    { id: "l7", name: "James William", username: "jwilliamclips", avatar: "https://i.pravatar.cc/200?img=32", role: "Clipper", bio: "Clip Labs top performer.", followers: 12800, joined: "Jul 2025", verified: false, scores: { weekly: 2600, monthly: 17400, overall: 133200 } },
    { id: "l8", name: "BeezoWins", username: "beezowinsvip", avatar: "https://i.pravatar.cc/200?img=15", role: "Brand", bio: "Creator of BeezoWins VIP Picks.", followers: 5300, joined: "Oct 2025", verified: true, scores: { weekly: 1900, monthly: 15100, overall: 124800 } },
    { id: "l9", name: "Ananya Roy", username: "ananyaroy", avatar: "https://i.pravatar.cc/200?img=25", role: "Creator", bio: "Design-first content, always.", followers: 7600, joined: "Mar 2025", verified: false, scores: { weekly: 2200, monthly: 13900, overall: 117400 } },
    { id: "l10", name: "Kabir Shah", username: "kabirshah", avatar: "https://i.pravatar.cc/200?img=17", role: "Clipper", bio: "Editing since 2019.", followers: 6100, joined: "Apr 2025", verified: false, scores: { weekly: 3100, monthly: 12800, overall: 109700 } },
    { id: "l11", name: "Priya Nair", username: "priyanair", avatar: "https://i.pravatar.cc/200?img=29", role: "Creator", bio: "Fashion + lifestyle content.", followers: 18400, joined: "Feb 2025", verified: true, scores: { weekly: 1700, monthly: 11600, overall: 103200 } },
    { id: "l12", name: "Devon Marsh", username: "devonmarsh", avatar: "https://i.pravatar.cc/200?img=8", role: "Brand", bio: "Growth partner for indie brands.", followers: 4200, joined: "Jan 2025", verified: false, scores: { weekly: 2400, monthly: 10500, overall: 96800 } },
    { id: "l13", name: "Rahul Verma", username: "rahulverma", avatar: "https://i.pravatar.cc/200?img=12", role: "Clipper", bio: "Weekly output: 40+ clips.", followers: 5900, joined: "Jun 2025", verified: false, scores: { weekly: 1300, monthly: 9400, overall: 89300 } },
    { id: "l14", name: "Sofia Chen", username: "sofiachen", avatar: "https://i.pravatar.cc/200?img=36", role: "Creator", bio: "Product reviews and unboxings.", followers: 11200, joined: "May 2025", verified: false, scores: { weekly: 1900, monthly: 8700, overall: 82100 } },
    { id: "l15", name: "Omar Farouk", username: "omarfarouk", avatar: "https://i.pravatar.cc/200?img=52", role: "Clipper", bio: "Sports clips, mostly football.", followers: 3800, joined: "Aug 2025", verified: false, scores: { weekly: 1100, monthly: 7900, overall: 75600 } },
    { id: "l16", name: "Nadia Osei", username: "nadiaosei", avatar: "https://i.pravatar.cc/200?img=41", role: "Brand", bio: "Skincare, D2C.", followers: 9100, joined: "Mar 2025", verified: true, scores: { weekly: 1500, monthly: 7200, overall: 69400 } },
    { id: "l17", name: "Leo Martins", username: "leomartins", avatar: "https://i.pravatar.cc/200?img=6", role: "Creator", bio: "Music + culture commentary.", followers: 6700, joined: "Sep 2025", verified: false, scores: { weekly: 900, monthly: 6500, overall: 63900 } },
    { id: "l18", name: "Isha Kapoor", username: "ishakapoor", avatar: "https://i.pravatar.cc/200?img=39", role: "Clipper", bio: "Gaming clips specialist.", followers: 4400, joined: "Oct 2025", verified: false, scores: { weekly: 1200, monthly: 5800, overall: 58200 } },
    { id: "l19", name: "Marcus Webb", username: "marcuswebb", avatar: "https://i.pravatar.cc/200?img=3", role: "Brand", bio: "Supplements & fitness.", followers: 7800, joined: "Feb 2025", verified: false, scores: { weekly: 800, monthly: 5100, overall: 52700 } },
    { id: "l20", name: "Elena Vos", username: "elenavos", avatar: "https://i.pravatar.cc/200?img=45", role: "Creator", bio: "Travel + food content.", followers: 13500, joined: "Jul 2025", verified: true, scores: { weekly: 1000, monthly: 4600, overall: 47300 } },
    { id: "l21", name: "Tariq Ahmed", username: "tariqahmed", avatar: "https://i.pravatar.cc/200?img=54", role: "Clipper", bio: "New to the platform, climbing fast.", followers: 1900, joined: "Dec 2025", verified: false, scores: { weekly: 1600, monthly: 4100, overall: 41800 } },
    { id: "l22", name: "Grace Lin", username: "gracelin", avatar: "https://i.pravatar.cc/200?img=48", role: "Creator", bio: "Beauty tutorials.", followers: 5200, joined: "Jan 2026", verified: false, scores: { weekly: 700, monthly: 3500, overall: 36200 } },
    { id: "l23", name: "Victor Diaz", username: "victordiaz", avatar: "https://i.pravatar.cc/200?img=19", role: "Brand", bio: "SaaS for creators.", followers: 2600, joined: "Nov 2025", verified: false, scores: { weekly: 650, monthly: 2900, overall: 31400 } },
    { id: "l24", name: "Hana Suzuki", username: "hanasuzuki", avatar: "https://i.pravatar.cc/200?img=57", role: "Clipper", bio: "Anime + pop culture clips.", followers: 3100, joined: "Oct 2025", verified: false, scores: { weekly: 500, monthly: 2300, overall: 26700 } },
  ];