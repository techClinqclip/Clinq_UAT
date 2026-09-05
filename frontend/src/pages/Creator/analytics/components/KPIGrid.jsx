import {
    Eye,
    Wallet,
    Megaphone,
    Users,
    Activity,
    FileCheck,
  } from "lucide-react";
  
  const kpiConfig = [
    {
      key: "totalViews",
      title: "Total Views",
      icon: Eye,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      key: "totalEarnings",
      title: "Total Earnings",
      icon: Wallet,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      key: "totalGigs",
      title: "Total Gigs",
      icon: Megaphone,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      key: "activeClippers",
      title: "Active Clippers",
      icon: Users,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      key: "engagementRate",
      title: "Engagement Rate",
      icon: Activity,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
    },
    {
      key: "totalSubmissions",
      title: "Total Submissions",
      icon: FileCheck,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
  ];
  
  export default function KPIGrid({ data = {} }) {
    return (
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {kpiConfig.map((item) => {
          const Icon = item.icon;
  
          return (
            <div
              key={item.key}
              className="group rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}
                >
                  <Icon className={item.color} size={22} />
                </div>
  
                <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
                  +12%
                </span>
              </div>
  
              <h2 className="mt-6 text-4xl font-bold text-white">
                {data[item.key] || "0"}
              </h2>
  
              <p className="mt-2 text-zinc-400">
                {item.title}
              </p>
            </div>
          );
        })}
      </section>
    );
  }
