export default function SidebarCard({ title, icon: Icon, accentClass = "text-violet-400", children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:border-white/20">
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon size={16} className={accentClass} />}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}