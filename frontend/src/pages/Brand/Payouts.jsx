import {
  IndianRupee,
  Wallet,
  Clock3,
  BadgeCheck,
  Check,
  X,
} from "lucide-react";

import { useState } from "react";
import PayoutTrendChart from "./PayoutTrendChart";

const stats = [
  {
    title: "Total Paid Out",
    value: "₹52,000",
    icon: IndianRupee,
  },
  {
    title: "Pending Payouts",
    value: "₹8,400",
    icon: Wallet,
  },
  {
    title: "Completed Transactions",
    value: "124",
    icon: BadgeCheck,
  },
  {
    title: "Average Payout",
    value: "₹419",
    icon: Clock3,
  },
];

const payoutTrendData = {
  "7D": [
    { period: "Mon", amount: 2000 },
    { period: "Tue", amount: 3500 },
    { period: "Wed", amount: 4200 },
    { period: "Thu", amount: 6000 },
    { period: "Fri", amount: 8500 },
    { period: "Sat", amount: 11000 },
    { period: "Sun", amount: 15000 },
  ],

  "30D": [
    { period: "W1", amount: 12000 },
    { period: "W2", amount: 18000 },
    { period: "W3", amount: 28000 },
    { period: "W4", amount: 52000 },
  ],

  "6M": [
    { period: "Jan", amount: 12000 },
    { period: "Feb", amount: 18000 },
    { period: "Mar", amount: 24000 },
    { period: "Apr", amount: 28000 },
    { period: "May", amount: 36000 },
    { period: "Jun", amount: 52000 },
  ],

  "All": [
    { period: "2023", amount: 50000 },
    { period: "2024", amount: 180000 },
    { period: "2025", amount: 420000 },
    { period: "2026", amount: 820000 },
  ],
};

const pendingRequests = [
  {
    username: "@editingpro",
    campaign: "Podcast Clips",
    amount: "₹1,200",
    views: "82K",
    status: "Processing",
  },
  {
    username: "@viralshorts",
    campaign: "Finance Creator",
    amount: "₹800",
    views: "45K",
    status: "Scheduled",
  },
  {
    username: "@reelmaster",
    campaign: "Fitness Reels",
    amount: "₹1,450",
    views: "96K",
    status: "Processing",
  },
];

const transactions = [
  {
    username: "@editingpro",
    amount: "₹3,200",
    date: "12 Jul",
    status: "Paid",
  },
  {
    username: "@viralshorts",
    amount: "₹2,850",
    date: "10 Jul",
    status: "Paid",
  },
  {
    username: "@reelmaster",
    amount: "₹2,100",
    date: "8 Jul",
    status: "Paid",
  },
];

const topEarners = [
  {
    username: "@editingpro",
    earnings: "₹3,200",
  },
  {
    username: "@viralshorts",
    earnings: "₹2,850",
  },
  {
    username: "@reelmaster",
    earnings: "₹2,100",
  },
];

export default function Payouts() {
  const [filter, setFilter] = useState("30D");

  const activeData = payoutTrendData[filter];
  const totalPaid = activeData.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <div className="space-y-8">

      {/* Header */}

      <div>
        <h1 className="text-4xl font-bold text-white">
          Payouts
        </h1>

        <p className="mt-2 text-zinc-400">
          Manage clipper payouts and transaction history.
        </p>
      </div>

      {/* KPI Cards */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-3xl border border-white/10 bg-[#11111A] p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                <Icon
                  size={22}
                  className="text-violet-400"
                />
              </div>

              <h2 className="mt-6 text-4xl font-bold text-white">
                {stat.value}
              </h2>

              <p className="mt-2 text-zinc-500">
                {stat.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Payout Trend */}

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

        <div className="flex items-center justify-between">
          
        <div className="mb-6 flex items-center justify-between">
  <div>
    <p className="text-sm uppercase tracking-[0.2em] text-violet-400">
      Payout Overview
    </p>

    <h3 className="mt-3 text-4xl font-bold text-white">
      ₹{totalPaid.toLocaleString()}
    </h3>

    <p className="mt-2 text-sm text-zinc-500">
      Total payouts for {filter}
    </p>
  </div>
</div>

          <div>
            <h2 className="text-2xl font-bold text-white">
              Payout Distribution Trend
            </h2>

            <p className="mt-2 text-zinc-400">
              Monitor payout growth over time.
            </p>
          </div>

          <div className="flex gap-2">
            {["7D", "30D", "6M", "All"].map((period) => (
              <button
                key={period}
                onClick={() => setFilter(period)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  filter === period
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 text-zinc-400"
                }`}
              >
                {period}
              </button>
            ))}
          </div>

        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0B0B12] p-4">
          <PayoutTrendChart data={activeData} />
        </div>

        

      </section>

      {/* Pending Requests */}

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

<div className="flex items-center justify-between">
  <div>
    <h2 className="text-2xl font-bold text-white">
      Pending Payouts
    </h2>

    <p className="mt-2 text-zinc-400">
      Upcoming payouts currently being processed by the platform.
    </p>
  </div>

  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-400">
    ₹3,450 Pending
  </div>
</div>

<div className="mt-6 overflow-x-auto">

  <table className="w-full">

    <thead>
      <tr className="border-b border-white/10">
        <th className="pb-4 text-left text-zinc-500">
          Clipper
        </th>

        <th className="pb-4 text-left text-zinc-500">
          Campaign
        </th>

        <th className="pb-4 text-left text-zinc-500">
          Views
        </th>

        <th className="pb-4 text-left text-zinc-500">
          Amount
        </th>

        <th className="pb-4 text-left text-zinc-500">
          Status
        </th>
      </tr>
    </thead>

    <tbody>
      {pendingRequests.map((request) => (
        <tr
          key={request.username}
          className="border-b border-white/5"
        >
          <td className="py-5 text-white">
            {request.username}
          </td>

          <td className="py-5 text-zinc-300">
            {request.campaign}
          </td>

          <td className="py-5 text-white">
            {request.views}
          </td>

          <td className="py-5 font-medium text-violet-400">
            {request.amount}
          </td>

          <td className="py-5">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                request.status === "Processing"
                  ? "bg-blue-500/10 text-blue-400"
                  : request.status === "Scheduled"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-green-500/10 text-green-400"
              }`}
            >
              {request.status}
            </span>
          </td>
        </tr>
      ))}
    </tbody>

  </table>

</div>

</section>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Transactions */}

        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

          <h2 className="text-2xl font-bold text-white">
            Recent Transactions
          </h2>

          <div className="mt-6 space-y-4">

            {transactions.map((transaction) => (
              <div
                key={transaction.username}
                className="flex items-center justify-between rounded-2xl border border-white/10 p-4"
              >
                <div>
                  <h3 className="font-semibold text-white">
                    {transaction.username}
                  </h3>

                  <p className="text-sm text-zinc-500">
                    {transaction.date}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-violet-400">
                    {transaction.amount}
                  </p>

                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}

          </div>

        </section>

        {/* Top Earners */}

        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

          <h2 className="text-2xl font-bold text-white">
            Top Earners
          </h2>

          <div className="mt-6 space-y-4">

            {topEarners.map((earner) => (
              <div
                key={earner.username}
                className="flex items-center justify-between rounded-2xl border border-white/10 p-4"
              >
                <span className="text-white">
                  {earner.username}
                </span>

                <span className="font-semibold text-violet-400">
                  {earner.earnings}
                </span>
              </div>
            ))}

          </div>

        </section>

      </div>

    </div>
  );
}