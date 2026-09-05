import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";

export default function TopClippersTable({ clippers = [] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

      {/* Header */}

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Trophy className="text-yellow-400" size={24} />
            Top Clippers
          </h2>

          <p className="mt-2 text-zinc-400">
            Highest performing clippers across all your gigs.
          </p>

        </div>

        <Link
          to="/creator/clippers"
          className="flex items-center gap-2 text-violet-400 transition hover:text-violet-300"
        >
          View All

          <ArrowRight size={16} />
        </Link>

      </div>

      {/* Table */}

      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead>

            <tr className="border-b border-white/10 text-left text-sm text-zinc-500">

              <th className="pb-4 font-medium">Clipper</th>

              <th className="pb-4 font-medium">Clips</th>

              <th className="pb-4 font-medium">Views</th>

              <th className="pb-4 font-medium">Revenue Generated</th>

              <th className="pb-4 text-right font-medium">Action</th>

            </tr>

          </thead>

          <tbody>

            {clippers.map((clipper) => (

              <tr
                key={clipper.id}
                className="border-b border-white/5 transition hover:bg-white/5"
              >

                {/* Clipper */}

                <td className="py-5">

                  <div className="flex items-center gap-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/10 text-lg font-semibold text-violet-400">
                      {clipper.name.charAt(0)}
                    </div>

                    <div>

                      <p className="font-semibold text-white">
                        {clipper.name}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Top Performer
                      </p>

                    </div>

                  </div>

                </td>

                {/* Clips */}

                <td className="py-5 text-white">
                  {clipper.clips}
                </td>

                {/* Views */}

                <td className="py-5 text-white">
                  {clipper.views}
                </td>

                {/* Revenue */}

                <td className="py-5 font-medium text-green-400">
                  {clipper.revenue}
                </td>

                {/* Action */}

                <td className="py-5 text-right">

                  <Link
                    to={`/creator/clippers/${clipper.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-white"
                  >
                    View Profile

                    <ArrowRight size={15} />
                  </Link>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </section>
  );
}
