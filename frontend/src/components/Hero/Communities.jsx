import { Link } from "react-router-dom";
import {
  Users,
  Scissors,
  BriefcaseBusiness,
  ArrowRight,
} from "lucide-react";

const communities = [
  {
    title: "For Creator",
    role: "creator",
    description:
      "Post your content, grow your audience, and reward talented clippers who amplify your reach.",
    icon: Users,
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "For Clipper",
    role: "clipper",
    description:
      "Discover campaigns, create engaging clips, and earn rewards for every approved submission.",
    icon: Scissors,
    color: "from-fuchsia-500 to-violet-600",
  },
  {
    title: "For Brand",
    role: "brand",
    description:
      "Launch campaigns, connect with creators, and receive high-quality short-form content.",
    icon: BriefcaseBusiness,
    color: "from-indigo-500 to-violet-600",
  },
];

export default function Communities() {
  return (
    <section className="bg-[#07070B] px-5 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">

        {/* Heading */}

        <div className="mb-14 text-center md:mb-20">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400 md:text-sm">
            Built For Everyone
          </span>

          <h2 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">
            One Platform.
            <br />
            Three Powerful Communities.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-400 md:text-lg">
            Whether you're creating content, clipping viral moments, or running
            campaigns, Clinq helps everyone grow together.
          </p>
        </div>

        {/* Cards */}

        <div className="relative">

          {/* Mobile Swipe Hint */}

          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center pr-2 lg:hidden">
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#07070B] via-[#07070B]/80 to-transparent" />

            <ArrowRight className="relative h-5 w-5 animate-pulse text-violet-400" />
          </div>

          <div
            className="
              flex gap-5 overflow-x-auto pb-4
              snap-x snap-mandatory scrollbar-hide

              lg:grid lg:grid-cols-3
              lg:gap-8 lg:overflow-visible
            "
          >
            {communities.map((community) => {
              const Icon = community.icon;

              return (
                <Link
                  key={community.title}
                  to={`/signup?role=${community.role}`}
                  className="
                    group
                    min-w-[300px]
                    snap-center

                    rounded-3xl
                    border border-white/10
                    bg-white/[0.03]

                    p-6 md:p-8

                    transition-all duration-300

                    hover:-translate-y-2
                    hover:border-violet-500/40
                    hover:bg-white/[0.05]

                    lg:min-w-0
                  "
                >
                  {/* Icon + Title */}

                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${community.color}`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    <h3 className="text-xl font-semibold text-white md:text-2xl">
                      {community.title}
                    </h3>
                  </div>

                  {/* Description */}

                  <p className="mt-6 leading-7 text-zinc-400">
                    {community.description}
                  </p>

                  {/* CTA */}

                  <div className="mt-8 flex items-center justify-between">
                    <span className="text-sm font-medium text-violet-400">
                      Join as a {" "}
                      {community.title.replace("For ", "")}
                    </span>

                    <ArrowRight className="h-4 w-4 text-violet-400 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}