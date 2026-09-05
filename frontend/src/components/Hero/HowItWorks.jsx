import {
  Search,
  Scissors,
  BadgeCheck,
  Gift,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Find Campaigns",
    description:
      "Browse campaigns from creators and brands that match your niche and interests.",
    icon: Search,
  },
  {
    number: "02",
    title: "Create Clips",
    description:
      "Edit engaging short-form content and submit your best clips for review.",
    icon: Scissors,
  },
  {
    number: "03",
    title: "Get Selected",
    description:
      "Creators and brands review submissions and choose the highest quality clips.",
    icon: BadgeCheck,
  },
  {
    number: "04",
    title: "Earn Rewards",
    description:
      "Receive rewards, build your reputation and unlock bigger campaigns.",
    icon: Gift,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#07070B] py-24 md:py-32 px-5 md:px-6">
      <div className="mx-auto max-w-7xl">

        {/* Heading */}

        <div className="mb-16 md:mb-24 text-center">
          <span className="text-xs md:text-sm uppercase tracking-[0.25em] font-semibold text-violet-400">
            How It Works
          </span>

          <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white leading-tight">
            Simple Steps.
            <br />
            Real Rewards.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-zinc-400">
            Start clipping in minutes. Follow a simple workflow and
            get rewarded for your creativity.
          </p>
        </div>

        {/* Mobile Timeline */}

        <div className="lg:hidden">
          <div className="relative">

            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="relative pl-16 pb-12 last:pb-0"
                >
                  {/* Vertical Line */}

                  {index !== steps.length - 1 && (
                    <div className="absolute left-[20px] top-12 h-full w-px bg-gradient-to-b from-violet-500/60 to-transparent" />
                  )}

                  {/* Step Circle */}

                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-sm font-semibold text-violet-400">
                    {step.number}
                  </div>

                  {/* Card */}

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="flex items-center gap-4">

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500">
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      <h3 className="text-xl font-semibold text-white">
                        {step.title}
                      </h3>

                    </div>

                    <p className="mt-4 text-zinc-400 leading-7">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Desktop Cards */}

        <div className="hidden lg:grid lg:grid-cols-4 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.number} className="relative">

                {/* Connector */}

                {index !== steps.length - 1 && (
                  <div className="absolute top-28 -right-14 z-10 flex items-center">
                    <div className="w-24 border-t border-dashed border-violet-500/40" />

                    <ArrowRight
                      size={18}
                      className="text-violet-400 -ml-1"
                    />
                  </div>
                )}

                {/* Card */}

                <div
                  className="
                    group
                    h-full
                    rounded-3xl
                    border
                    border-white/10
                    bg-white/[0.03]
                    p-8
                    transition-all
                    duration-300
                    hover:-translate-y-2
                    hover:border-violet-500/40
                    hover:bg-white/[0.05]
                    hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]
                  "
                >
                  {/* Icon */}

                  <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/20 transition-all duration-300 group-hover:scale-110">
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  {/* Step Badge */}

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-sm font-semibold text-violet-400">
                      {step.number}
                    </div>

                    <span className="text-sm uppercase tracking-[0.2em] text-violet-400 font-medium">
                      Step
                    </span>

                  </div>

                  {/* Title */}

                  <h3 className="mt-5 text-2xl font-semibold text-white">
                    {step.title}
                  </h3>

                  {/* Description */}

                  <p className="mt-4 leading-7 text-zinc-400">
                    {step.description}
                  </p>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}