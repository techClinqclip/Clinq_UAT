import { useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";

export default function AdminSettings() {
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const runScraper = async () => {
    setIsRunning(true);
    setLastRun(null);
    try {
      const result = await api("/api/content/campaigns/admin-scrape-insights/", { method: "POST" });
      setLastRun(result);
      showToast({
        type: "success",
        message: `Scraper completed: ${result.updated} submission${result.updated === 1 ? "" : "s"} updated.`,
      });
    } catch (error) {
      showToast({ type: "error", message: error.message || "Unable to run the content scraper." });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
          Admin Settings
        </span>
        <h1 className="mt-5 text-4xl font-bold">Platform tools</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Run controlled maintenance and data refresh operations for the marketplace.
        </p>
      </section>

      <section className="mt-8 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Database size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Content insights scraper</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Fetch views and likes for pending or approved submissions belonging to active campaigns and gigs. URLs are sent to the scraper in batches of 20, and results are saved to the database.
            </p>
            <button
              type="button"
              onClick={runScraper}
              disabled={isRunning}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRunning ? "animate-spin" : ""} />
              {isRunning ? "Running scraper..." : "Run content scraper"}
            </button>

            {lastRun && (
              <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-4">
                <div><p className="text-zinc-500">Eligible</p><p className="mt-1 font-semibold">{lastRun.eligible}</p></div>
                <div><p className="text-zinc-500">Processed</p><p className="mt-1 font-semibold">{lastRun.processed}</p></div>
                <div><p className="text-zinc-500">Updated</p><p className="mt-1 font-semibold text-emerald-400">{lastRun.updated}</p></div>
                <div><p className="text-zinc-500">Failed</p><p className="mt-1 font-semibold text-amber-400">{lastRun.failed}</p></div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
