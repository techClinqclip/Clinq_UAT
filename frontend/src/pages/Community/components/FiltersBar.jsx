const FILTERS = ["All", "Trending"];

export default function FiltersBar({ active, onChange }) {
  return (
    <div className="flex w-full items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 sm:w-auto">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition sm:flex-none ${
            active === filter
              ? "bg-white/10 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
