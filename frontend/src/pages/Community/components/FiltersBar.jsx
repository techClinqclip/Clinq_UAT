const FILTERS = ["All", "Trending"];

export default function FiltersBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
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