import {
    LayoutDashboard,
    Search,
    Users,
    Trophy,
    BookOpen,
    Wallet,
    Bell,
    User,
} from "lucide-react";

const menu = [
    {
        title: "Marketplace",
        icon: LayoutDashboard,
        active: true,
    },
    {
        title: "Discover",
        icon: Search,
    },
    {
        title: "Community",
        icon: Users,
    },
    {
        title: "Leaderboard",
        icon: Trophy,
    },
    {
        title: "Blogs",
        icon: BookOpen,
    },
    {
        title: "Wallet",
        icon: Wallet,
    },
    {
        title: "Notifications",
        icon: Bell,
    },
    {
        title: "Profile",
        icon: User,
    },
];

export default function MarketplaceSidebar() {
    return (
        <div className="sticky top-6 rounded-3xl border border-white/10 bg-white p-4">
            <h2 className="mb-6 text-xl font-semibold">
                Clinq
            </h2>

            <nav className="space-y-2">
                {menu.map(({ title, icon: Icon, active }) => (
                    <button
                        key={title}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition ${
                            active
                                ? "bg-black text-white"
                                : "hover:bg-gray-100"
                        }`}
                    >
                        <Icon size={20} />
                        <span>{title}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}