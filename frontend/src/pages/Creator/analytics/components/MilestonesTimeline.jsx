import { Trophy, TrendingUp, Wallet, FileCheck, Users } from "lucide-react";

const icons = {
  views: TrendingUp,
  earnings: Wallet,
  submissions: FileCheck,
  community: Users,
  achievement: Trophy,
};

export default function MilestonesTimeline({ milestones = [] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

      {/* Header */}

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Recent Milestones
        </h2>

        <p className="mt-2 text-zinc-400">
          Celebrate important achievements across your creator journey.
        </p>
      </div>

      {/* Timeline */}

      <div className="relative">

        {/* Vertical Line */}

        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/10" />

        <div className="space-y-8">

          {milestones.map((milestone) => {
            const Icon =
              icons[milestone.type] || Trophy;

            return (
              <div
                key={milestone.id}
                className="relative flex gap-5"
              >

                {/* Timeline Icon */}

                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">

                  <Icon
                    size={18}
                    className="text-violet-400"
                  />

                </div>

                {/* Content */}

                <div className="flex-1 rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-violet-500/30">

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <h3 className="font-semibold text-white">
                        {milestone.title}
                      </h3>

                      <p className="mt-2 text-sm text-zinc-400">
                        {milestone.description}
                      </p>

                    </div>

                    <span className="whitespace-nowrap text-xs text-zinc-500">
                      {milestone.date}
                    </span>

                  </div>

                </div>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}
