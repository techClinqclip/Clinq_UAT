import { useState } from "react";
import Select from "react-select";
import {
  FaInstagram,
  FaYoutube,
  FaFacebookF,
  FaXTwitter,
} from "react-icons/fa6";
import { FiSearch } from "react-icons/fi";

const statuses = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

const categories = [
  { value: "all", label: "All Categories" },
  { value: "fashion", label: "Fashion" },
  { value: "gaming", label: "Gaming" },
  { value: "tech", label: "Tech" },
  { value: "beauty", label: "Beauty" },
  { value: "travel", label: "Travel" },
];

const rewards = [
  { value: "all", label: "All Rewards" },
  { value: "10k", label: "< ₹10k" },
  { value: "50k", label: "₹10k - ₹50k" },
  { value: "100k", label: "> ₹50k" },
];

const sorts = [
  { value: "newest", label: "Newest" },
  { value: "reward", label: "Highest Reward" },
  { value: "popular", label: "Most Popular" },
  { value: "ending", label: "Ending Soon" },
];

const platformIcons = [
  {
    name: "Instagram",
    icon: FaInstagram,
  },
  {
    name: "YouTube",
    icon: FaYoutube,
  },
  {
    name: "X",
    icon: FaXTwitter,
  },
  {
    name: "Facebook",
    icon: FaFacebookF,
  },
];

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "#18181b",
    borderColor: state.isFocused ? "#8b5cf6" : "#3f3f46",
    borderRadius: "14px",
    minHeight: "48px",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#8b5cf6",
    },
  }),

  menu: (base) => ({
    ...base,
    backgroundColor: "#18181b",
    borderRadius: "14px",
    border: "1px solid #3f3f46",
    overflow: "hidden",
  }),

  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#7c3aed" : "#18181b",
    color: "#fff",
    cursor: "pointer",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#fff",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#a1a1aa",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    color: "#a1a1aa",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),
};

export default function DiscoveryToolbar({ filters = {}, onFilterChange = () => {} }) {
  const search = filters.search || "";
  const platform = filters.platform || "All";

  return (
    <section className="py-8">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl p-6 shadow-2xl space-y-6">
        <div className="relative">
          <FiSearch
            size={20}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500"
          />

          <input
            value={search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search campaigns, brands, creators..."
            className="
              h-14
              w-full
              rounded-2xl
              border
              border-zinc-800
              bg-zinc-900
              pl-14
              pr-5
              text-white
              placeholder:text-zinc-500
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
            "
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select
            styles={selectStyles}
            options={statuses}
            value={statuses.find((item) => item.value === (filters.status || "all")) || statuses[0]}
            onChange={(option) => onFilterChange("status", option?.value || "all")}
            placeholder="Status"
            isSearchable={false}
          />

          <Select
            styles={selectStyles}
            options={categories}
            value={categories.find((item) => item.value === (filters.category || "all")) || categories[0]}
            onChange={(option) => onFilterChange("category", option?.value || "all")}
            placeholder="Category"
            isSearchable={false}
          />

          <Select
            styles={selectStyles}
            options={rewards}
            value={rewards.find((item) => item.value === (filters.reward || "all")) || rewards[0]}
            onChange={(option) => onFilterChange("reward", option?.value || "all")}
            placeholder="Reward"
            isSearchable={false}
          />

          <Select
            styles={selectStyles}
            options={sorts}
            value={sorts.find((item) => item.value === (filters.sort || "newest")) || sorts[0]}
            onChange={(option) => onFilterChange("sort", option?.value || "newest")}
            placeholder="Sort By"
            isSearchable={false}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onFilterChange("platform", "All")}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              platform === "All"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            All
          </button>

          {platformIcons.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => onFilterChange("platform", name)}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                platform === name
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}