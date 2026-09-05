import { useState } from "react";
import {
  ArrowLeft,
  Plus,
} from "lucide-react";
import {
    FaYoutube,
    FaInstagram,
    FaFacebook,
    FaXTwitter,
  } from "react-icons/fa6";
import { Link } from "react-router-dom";

export default function CreateCampaign() {
  const [resources, setResources] = useState([
    {
      name: "",
      link: "",
    },
  ]);

  const [platforms, setPlatforms] = useState([]);

  const [formData, setFormData] = useState({
    campaignName: "",
    category: "",
    description: "",
    requirements: "",
    rewardPerK: "",
    budget: "",
    maxEarningsPercent: 10,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });

  const togglePlatform = (platform) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter((p) => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const addResource = () => {
    setResources([
      ...resources,
      {
        name: "",
        link: "",
      },
    ]);
  };

  const removeResource = (index) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const updateResource = (index, field, value) => {
    const updated = [...resources];
    updated[index][field] = value;
    setResources(updated);
  };

  return (
    <div className="space-y-8">
      {/* Back */}

      <Link
        to="/creator/campaigns"
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
          Launch a campaign and let clippers start creating content.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_350px]">
        {/* Form */}

        <div className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <form className="space-y-8">
            {/* Campaign Name + Category */}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Campaign Name
                </label>

                <input
                  type="text"
                  placeholder="Podcast Clips Campaign"
                  className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Category
                </label>

                <select className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white">
                  <option>Entertainment</option>
                  <option>Gaming</option>
                  <option>Finance</option>
                  <option>Education</option>
                  <option>Technology</option>
                  <option>Podcast</option>
                </select>
              </div>
            </div>

            {/* Thumbnail */}

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Campaign Thumbnail
              </label>

              <input
                type="file"
                className="w-full rounded-2xl border border-dashed border-white/10 bg-[#0B0B12] p-4 text-zinc-400"
              />
            </div>

            {/* Description */}

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Description
              </label>

              <textarea
                rows={5}
                placeholder="Describe your campaign..."
                className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
              />
            </div>

            {/* Requirements */}

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Requirements For Clippers
              </label>

              <textarea
                rows={6}
                placeholder="Hook under 3 seconds, use subtitles, avoid copyrighted music..."
                className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
              />
            </div>

            {/* Resources */}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm font-medium text-white">
                  Resources
                </label>

                <button
                  type="button"
                  onClick={addResource}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-white"
                >
                  <Plus size={16} />
                  Add Resource
                </button>
              </div>

              <div className="space-y-4">
                {resources.map((resource, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-[#0B0B12] p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        type="text"
                        placeholder="Resource Name"
                        value={resource.name}
                        onChange={(e) =>
                          updateResource(
                            index,
                            "name",
                            e.target.value
                          )
                        }
                        className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                      />

                      <input
                        type="url"
                        placeholder="Google Drive Link"
                        value={resource.link}
                        onChange={(e) =>
                          updateResource(
                            index,
                            "link",
                            e.target.value
                          )
                        }
                        className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                      />

                      <button
                        type="button"
                        onClick={() => removeResource(index)}
                        className="rounded-xl border border-red-500/30 px-3 text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platforms */}

            <div>
              <label className="mb-4 block text-sm font-medium text-white">
                Platforms
              </label>

              <div className="grid gap-4 md:grid-cols-4">
                {[
                  {
                    name: "YouTube",
                    icon: Youtube,
                  },
                  {
                    name: "Instagram",
                    icon: Instagram,
                  },
                  {
                    name: "Facebook",
                    icon: Facebook,
                  },
                  {
                    name: "X",
                    icon: Plus,
                  },
                ].map((platform) => {
                  const Icon = platform.icon;

                  return (
                    <button
                      key={platform.name}
                      type="button"
                      onClick={() =>
                        togglePlatform(platform.name)
                      }
                      className={`flex items-center justify-center gap-2 rounded-2xl border p-4 transition ${
                        platforms.includes(platform.name)
                          ? "border-violet-500 bg-violet-500/10 text-violet-400"
                          : "border-white/10 text-zinc-400"
                      }`}
                    >
                      <Icon size={18} />
                      {platform.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reward + Budget */}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Reward Per 1K Views (₹)
                </label>

                <input
                  type="number"
                  placeholder="20"
                  className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Campaign Budget (₹)
                </label>

                <input
                  type="number"
                  placeholder="10000"
                  className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
                />
              </div>
            </div>

            {/* Max Earnings */}

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Max Earnings Per Clipper (%)
              </label>

              <input
                type="number"
                defaultValue={10}
                className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
              />
            </div>

            {/* Dates */}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Start Date
                </label>

                <input
                  type="date"
                  defaultValue={formData.startDate}
                  className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  End Date (Optional)
                </label>

                <input
                  type="date"
                  className="w-full rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-violet-600 px-8 py-3 font-medium text-white"
            >
              Create Campaign
            </button>
          </form>
        </div>

        {/* Summary Card */}

        <div className="h-fit rounded-3xl border border-white/10 bg-[#11111A] p-6">
          <h3 className="text-xl font-bold text-white">
            Campaign Summary
          </h3>

          <div className="mt-6 space-y-4">
            <div className="flex justify-between">
              <span className="text-zinc-400">Platforms</span>
              <span className="text-white">
                {platforms.length}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Resources</span>
              <span className="text-white">
                {resources.length}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Max Earnings</span>
              <span className="text-white">10%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}