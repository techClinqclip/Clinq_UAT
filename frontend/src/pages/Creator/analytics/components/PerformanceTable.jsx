import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const statusColors = {
  Active: "bg-green-500/10 text-green-400",
  Completed: "bg-blue-500/10 text-blue-400",
  Paused: "bg-yellow-500/10 text-yellow-400",
};

export default function PerformanceTable({ gigs = [] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">

      {/* Header */}

      <div className="mb-8 flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold text-white">
            Gig Performance
          </h2>

          <p className="mt-2 text-zinc-400">
            Compare views, submissions and earnings across your gigs.
          </p>
        </div>

        <Link
          to="/creator/gigs"
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

              <th className="pb-4 font-medium">Gig</th>

              <th className="pb-4 font-medium">Views</th>

              <th className="pb-4 font-medium">Submissions</th>

              <th className="pb-4 font-medium">Earnings</th>

              <th className="pb-4 font-medium">Status</th>

              <th className="pb-4 text-right font-medium">Action</th>

            </tr>

          </thead>

          <tbody>

            {gigs.map((gig) => (

              <tr
                key={gig.id}
                className="border-b border-white/5 transition hover:bg-white/5"
              >

                <td className="py-5">

                  <div>

                    <p className="font-semibold text-white">
                      {gig.title}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      ID #{gig.id}
                    </p>

                  </div>

                </td>

                <td className="py-5 text-white">
                  {gig.views}
                </td>

                <td className="py-5 text-white">
                  {gig.submissions}
                </td>

                <td className="py-5 font-medium text-green-400">
                  {gig.earnings}
                </td>

                <td className="py-5">

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      statusColors[gig.status]
                    }`}
                  >
                    {gig.status}
                  </span>

                </td>

                <td className="py-5 text-right">

                  <Link
                    to={`/creator/gigs/${gig.accessKey}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-white"
                  >
                    View

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
