import { useEffect, useRef, useState } from "react";
import { Database, Download, FileText, RefreshCw, Upload } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";
import { downloadResourceSampleTemplate } from "../../lib/resourceTemplate";

export default function AdminSettings() {
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [resourceTemplate, setResourceTemplate] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const templateFileInputRef = useRef(null);

  const loadResourceTemplate = async () => {
    try {
      setResourceTemplate(await api("/api/settings/resource-template/"));
    } catch (error) {
      showToast({ type: "error", message: error.message || "Unable to load the resource template." });
    }
  };

  useEffect(() => {
    loadResourceTemplate();
  }, []);

  const updateResourceTemplate = async () => {
    if (!templateFile) {
      showToast({ type: "error", message: "Choose a template document first." });
      return;
    }

    const formData = new FormData();
    formData.append("document", templateFile);
    setIsTemplateSaving(true);
    try {
      const updatedTemplate = await api("/api/settings/resource-template/", {
        method: "PUT",
        body: formData,
      });
      setResourceTemplate(updatedTemplate);
      setTemplateFile(null);
      if (templateFileInputRef.current) templateFileInputRef.current.value = "";
      showToast({ type: "success", message: "Resource sample template updated." });
    } catch (error) {
      showToast({ type: "error", message: error.message || "Unable to update the resource template." });
    } finally {
      setIsTemplateSaving(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      await downloadResourceSampleTemplate(resourceTemplate?.filename);
    } catch (error) {
      showToast({ type: "error", message: error.message || "Unable to download the resource template." });
    }
  };

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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <FileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Resource sample template</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This document appears in the Resources section whenever a brand creates a campaign or a creator creates a gig.
            </p>

            {resourceTemplate?.documentUrl ? (
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-300 transition hover:text-violet-200"
              >
                <Download size={16} />
                Download current template: {resourceTemplate.filename}
              </button>
            ) : (
              <p className="mt-4 text-sm text-amber-300">No template has been uploaded yet.</p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={templateFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
                className="block w-full max-w-md cursor-pointer rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
              />
              <button
                type="button"
                onClick={updateResourceTemplate}
                disabled={isTemplateSaving}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={16} />
                {isTemplateSaving ? "Updating..." : "Update template"}
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Supported: PDF, Word, Excel, CSV, or text documents.</p>
          </div>
        </div>
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
