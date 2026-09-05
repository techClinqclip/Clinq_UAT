import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
const campaigns = [
  {
    id: 1,
    title: "Podcast Clips Campaign",
    status: "Active",
    views: "520K",
    submissions: 126,
  },
  {
    id: 2,
    title: "Finance Creator Campaign",
    status: "Active",
    views: "210K",
    submissions: 42,
  },
  {
    id: 3,
    title: "Fitness Reels Campaign",
    status: "Inactive",
    views: "95K",
    submissions: 18,
  },
];

export default function Campaigns() {
  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-4xl font-bold text-white">
            Campaigns
          </h1>

          <p className="mt-2 text-zinc-400">
            Manage all your clipping campaigns.
          </p>
        </div>

        <Link
  to="/dashboard/campaigns/create"
  className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-medium text-white"
>
  <Plus size={18} />
  Create Campaign
</Link>

      </div>

      {/* Search */}

      <div className="relative">

        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
        />

        <input
          type="text"
          placeholder="Search campaigns..."
          className="w-full rounded-2xl border border-white/10 bg-[#11111A] py-3 pl-11 pr-4 text-white outline-none focus:border-violet-500"
        />

      </div>

      {/* Filters */}

      <div className="flex gap-3">

        <button className="rounded-xl bg-violet-600 px-4 py-2 text-white">
          All
        </button>

        <button className="rounded-xl border border-white/10 px-4 py-2 text-zinc-400">
          Active
        </button>

        <button className="rounded-xl border border-white/10 px-4 py-2 text-zinc-400">
          Inactive
        </button>

      </div>

      {/* Campaign List */}

      <div className="space-y-4">

        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="rounded-3xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <h3 className="text-xl font-semibold text-white">
                  {campaign.title}
                </h3>

                <p className="mt-2 text-zinc-400">
                  {campaign.status}
                </p>
              </div>

              <div className="flex gap-10">

                <div>
                  <p className="text-2xl font-bold text-white">
                    {campaign.views}
                  </p>

                  <p className="text-sm text-zinc-500">
                    Views
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white">
                    {campaign.submissions}
                  </p>

                  <p className="text-sm text-zinc-500">
                    Submissions
                  </p>
                </div>

              </div>

              
              <Link className="rounded-xl border border-white/10 px-4 py-2 text-white hover:border-violet-500/30"
  to={`/dashboard/campaigns/${campaign.id}`}
>
  Open Campaign
</Link>

            </div>
          </div>
        ))}

      </div>

    </div>
  );
}