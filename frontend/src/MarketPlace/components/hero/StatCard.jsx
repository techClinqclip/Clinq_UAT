export default function StatCard({
    icon: Icon,
    value,
    label,
  }) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:border-violet-500/20 hover:bg-white/10">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15">
          <Icon
            size={22}
            className="text-violet-400"
          />
        </div>
  
        <h3 className="text-3xl font-bold text-white">
          {value}
        </h3>
  
        <p className="mt-1 text-sm text-zinc-400">
          {label}
        </p>
      </div>
    );
  }