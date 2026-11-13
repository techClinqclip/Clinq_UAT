import { useState } from "react";
import Select from "react-select";
import {
  FaInstagram,
  FaYoutube,
  FaFacebookF,
  FaXTwitter,
} from "react-icons/fa6";
import { FiSearch } from "react-icons/fi";
import { SlidersHorizontal } from "lucide-react";
import Modal from "../../../shared/ui/Modal";

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
  { value: "all", label: "All Budgets" },
  { value: "10k", label: "< ₹10k" },
  { value: "50k", label: "₹10k – ₹50k" },
  { value: "100k", label: "> ₹50k" },
];

const sorts = [
  { value: "newest", label: "Newest" },
  { value: "reward", label: "Highest Budget" },
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

function prettifyCategory(value) {
  return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const modalSelectStyles = {
  ...selectStyles,
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

export default function DiscoveryToolbar({ filters = {}, onFilterChange = () => {} }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = filters.search || "";
  const platform = filters.platform || "All";

  const activeFilterCount = [
    (filters.status || "all") !== "all",
    (filters.category || "all") !== "all",
    (filters.reward || "all") !== "all",
    (filters.sort || "newest") !== "newest",
  ].filter(Boolean).length;

  return (
    <section className="py-8">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl p-6 shadow-2xl space-y-6">
        {/* Search row */}
        <div className="relative">
          <FiSearch
            size={20}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500"
          />

          <input
            value={search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search by name, brand or category..."
            className="
              h-14
              w-full
              rounded-2xl
              border
              border-zinc-800
              bg-zinc-900
              pl-14
              pr-4
              sm:pr-48
              text-white
              placeholder:text-zinc-500
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
            "
          />

          {/* Platform icons inline with search input — 640px and up only */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
            <div className="w-px h-5 bg-zinc-700 mr-1" />
            {platformIcons.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => onFilterChange("platform", platform === name ? "All" : name)}
                title={name}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  platform === name
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Platform icons row — below 640px only, icon-only for compact fit */}
        <div className="flex sm:hidden items-center gap-2">
          {platformIcons.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => onFilterChange("platform", platform === name ? "All" : name)}
              title={name}
              aria-label={name}
              className={`p-3 rounded-xl transition-all duration-200 ${
                platform === name
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
              }`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Filter dropdowns — 640px and up */}
        <div className="hidden sm:grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            value={
              categories.find((item) => item.value === (filters.category || "all")) ||
              (filters.category && filters.category !== "all"
                ? { value: filters.category, label: prettifyCategory(filters.category) }
                : categories[0])
            }
            onChange={(option) => onFilterChange("category", option?.value || "all")}
            placeholder="Category"
            isSearchable={false}
          />

          <Select
            styles={selectStyles}
            options={rewards}
            value={rewards.find((item) => item.value === (filters.reward || "all")) || rewards[0]}
            onChange={(option) => onFilterChange("reward", option?.value || "all")}
            placeholder="Budget"
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

        {/* Filters button — below 640px only */}
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-violet-500/50 hover:text-white w-full justify-center"
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile filter modal */}
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="md"
      >
        <div className="space-y-4">
          <Select
            styles={modalSelectStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={statuses}
            value={statuses.find((item) => item.value === (filters.status || "all")) || statuses[0]}
            onChange={(option) => onFilterChange("status", option?.value || "all")}
            placeholder="Status"
            isSearchable={false}
          />

          <Select
            styles={modalSelectStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={categories}
            value={
              categories.find((item) => item.value === (filters.category || "all")) ||
              (filters.category && filters.category !== "all"
                ? { value: filters.category, label: prettifyCategory(filters.category) }
                : categories[0])
            }
            onChange={(option) => onFilterChange("category", option?.value || "all")}
            placeholder="Category"
            isSearchable={false}
          />

          <Select
            styles={modalSelectStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={rewards}
            value={rewards.find((item) => item.value === (filters.reward || "all")) || rewards[0]}
            onChange={(option) => onFilterChange("reward", option?.value || "all")}
            placeholder="Budget"
            isSearchable={false}
          />

          <Select
            styles={modalSelectStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={sorts}
            value={sorts.find((item) => item.value === (filters.sort || "newest")) || sorts[0]}
            onChange={(option) => onFilterChange("sort", option?.value || "newest")}
            placeholder="Sort By"
            isSearchable={false}
          />

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="mt-2 w-full rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Apply Filters
          </button>
        </div>
      </Modal>
    </section>
  );
}