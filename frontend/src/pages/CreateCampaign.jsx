import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function CreateCampaign() {
  return (
    <div className="space-y-8">

      {/* Back Button */}

      <Link
        to="/dashboard/campaigns"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Campaigns
      </Link>

      {/* Header */}

      <div>
        <h1 className="text-4xl font-bold text-white">
          Create Campaign
        </h1>

        <p className="mt-2 text-zinc-400">
          Launch a new clipping campaign and start receiving submissions.
        </p>
      </div>

      {/* Form */}

      <div className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

        <form className="space-y-6">

          {/* Campaign Name */}

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Campaign Name
            </label>

            <input
              type="text"
              placeholder="Podcast Clips Campaign"
              className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none focus:border-violet-500"
            />
          </div>

          {/* Description */}

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Description
            </label>

            <textarea
              rows="5"
              placeholder="Describe your campaign..."
              className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none focus:border-violet-500"
            />
          </div>

          {/* Budget + Reward */}

          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Budget
              </label>

              <input
                type="number"
                placeholder="10000"
                className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Reward Per Clip
              </label>

              <input
                type="number"
                placeholder="500"
                className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </div>

          </div>

          {/* Platforms */}

          <div>
            <label className="mb-4 block text-sm font-medium text-white">
              Platforms
            </label>

            <div className="flex flex-wrap gap-4">

              <label className="flex items-center gap-2 text-zinc-300">
                <input type="checkbox" />
                YouTube
              </label>

              <label className="flex items-center gap-2 text-zinc-300">
                <input type="checkbox" />
                Instagram
              </label>

              

            </div>
          </div>

          {/* Dates */}

          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Start Date
              </label>

              <input
                type="date"
                className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                End Date
              </label>

              <input
                type="date"
                className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </div>

          </div>

          {/* Submit */}

          <button
            type="submit"
            className="rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
          >
            Create Campaign
          </button>

        </form>

      </div>

    </div>
  );
}