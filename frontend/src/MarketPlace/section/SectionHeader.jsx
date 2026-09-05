export default function SectionHeader({
    title,
    subtitle,
    action,
  }) {
    return (
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {title}
          </h2>
  
          {subtitle && (
            <p className="mt-2 text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
  
        {action}
      </div>
    );
  }