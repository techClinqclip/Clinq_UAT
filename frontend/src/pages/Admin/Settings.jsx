import { useEffect, useRef, useState } from "react";
import { Database, Download, FileText, RefreshCw, Scale, Shield, Upload } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";
import {
  LEGAL_DOCUMENT_KEYS,
  downloadLegalDocument,
  downloadResourceSampleTemplate,
} from "../../lib/resourceTemplate";

function DocumentUploadCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  documentMeta,
  accept,
  supportedText,
  fileInputRef,
  selectedFile,
  onFileChange,
  onUpdate,
  onDownload,
  isSaving,
  updateLabel,
}) {
  return (
    <section className="mt-8 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>

          {documentMeta?.documentUrl ? (
            <button
              type="button"
              onClick={onDownload}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-300 transition hover:text-violet-200"
            >
              <Download size={16} />
              Download current document: {documentMeta.filename}
            </button>
          ) : (
            <p className="mt-4 text-sm text-amber-300">No document has been uploaded yet.</p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={onFileChange}
              className="block w-full max-w-md cursor-pointer rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
            />
            <button
              type="button"
              onClick={onUpdate}
              disabled={isSaving}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} />
              {isSaving ? "Updating..." : updateLabel}
            </button>
          </div>
          {selectedFile ? (
            <p className="mt-2 text-xs text-zinc-400">Selected: {selectedFile.name}</p>
          ) : null}
          <p className="mt-3 text-xs text-zinc-500">{supportedText}</p>
        </div>
      </div>
    </section>
  );
}

export default function AdminSettings() {
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapeMessage, setScrapeMessage] = useState("");

  const [resourceTemplate, setResourceTemplate] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const templateFileInputRef = useRef(null);

  const [privacyDocument, setPrivacyDocument] = useState(null);
  const [privacyFile, setPrivacyFile] = useState(null);
  const [isPrivacySaving, setIsPrivacySaving] = useState(false);
  const privacyFileInputRef = useRef(null);

  const [termsDocument, setTermsDocument] = useState(null);
  const [termsFile, setTermsFile] = useState(null);
  const [isTermsSaving, setIsTermsSaving] = useState(false);
  const termsFileInputRef = useRef(null);

  const loadDocuments = async () => {
    try {
      const [template, privacy, terms] = await Promise.all([
        api("/api/settings/resource-template/"),
        api(`/api/settings/legal-documents/${LEGAL_DOCUMENT_KEYS.privacyPolicy}/`),
        api(`/api/settings/legal-documents/${LEGAL_DOCUMENT_KEYS.termsConditions}/`),
      ]);
      setResourceTemplate(template);
      setPrivacyDocument(privacy);
      setTermsDocument(terms);
    } catch (error) {
      showToast({ type: "error", message: error.message || "Unable to load platform documents." });
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const updateDocument = async ({
    file,
    endpoint,
    setMeta,
    setFile,
    fileInputRef,
    setSaving,
    successMessage,
    emptyMessage,
    failureMessage,
  }) => {
    if (!file) {
      showToast({ type: "error", message: emptyMessage });
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    setSaving(true);
    try {
      const updated = await api(endpoint, {
        method: "PUT",
        body: formData,
      });
      setMeta(updated);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast({ type: "success", message: successMessage });
    } catch (error) {
      showToast({ type: "error", message: error.message || failureMessage });
    } finally {
      setSaving(false);
    }
  };

  const runScraper = async () => {
    setIsRunning(true);
    setLastRun(null);
    setScrapeProgress(0);
    setScrapeMessage("Starting scraper...");
    try {
      const started = await api("/api/content/campaigns/admin-scrape-insights/", { method: "POST" });
      const taskId = started.taskId;
      if (!taskId) {
        throw new Error("Scraper started without a task id.");
      }

      setScrapeProgress(Number(started.progress || 0));
      setScrapeMessage(started.detail || "Scraper running...");

      let finalStatus = null;
      for (let attempt = 0; attempt < 900; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const statusPayload = await api(
          `/api/content/campaigns/admin-scrape-insights-status/?taskId=${encodeURIComponent(taskId)}`,
        );
        setScrapeProgress(Number(statusPayload.progress || 0));
        setScrapeMessage(statusPayload.message || "Scraper running...");

        if (statusPayload.status === "completed") {
          finalStatus = statusPayload;
          break;
        }
        if (statusPayload.status === "failed") {
          throw new Error(statusPayload.error || "Scraper failed.");
        }
      }

      if (!finalStatus) {
        throw new Error("Timed out while waiting for scraper results.");
      }

      setLastRun(finalStatus);
      setScrapeProgress(100);
      setScrapeMessage("Scraper completed.");
      showToast({
        type: "success",
        message: `Scraper completed: ${finalStatus.updated || 0} submission${finalStatus.updated === 1 ? "" : "s"} updated.`,
      });
    } catch (error) {
      setScrapeMessage(error.message || "Unable to run the content scraper.");
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

      <DocumentUploadCard
        icon={FileText}
        iconClassName="bg-violet-500/10 text-violet-300"
        title="Resource sample template"
        description="This document appears in the Resources section whenever a brand creates a campaign or a creator creates a gig."
        documentMeta={resourceTemplate}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        supportedText="Supported: PDF, Word, Excel, CSV, or text documents."
        fileInputRef={templateFileInputRef}
        selectedFile={templateFile}
        onFileChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
        onUpdate={() =>
          updateDocument({
            file: templateFile,
            endpoint: "/api/settings/resource-template/",
            setMeta: setResourceTemplate,
            setFile: setTemplateFile,
            fileInputRef: templateFileInputRef,
            setSaving: setIsTemplateSaving,
            successMessage: "Resource sample template updated.",
            emptyMessage: "Choose a template document first.",
            failureMessage: "Unable to update the resource template.",
          })
        }
        onDownload={async () => {
          try {
            await downloadResourceSampleTemplate(resourceTemplate?.filename);
          } catch (error) {
            showToast({ type: "error", message: error.message || "Unable to download the resource template." });
          }
        }}
        isSaving={isTemplateSaving}
        updateLabel="Update template"
      />

      <DocumentUploadCard
        icon={Shield}
        iconClassName="bg-emerald-500/10 text-emerald-300"
        title="Privacy Policy"
        description="Shown on the signup page and at /privacy. Upload the latest Privacy Policy document for users to review."
        documentMeta={privacyDocument}
        accept=".pdf,.doc,.docx,.txt"
        supportedText="Supported: PDF, Word, or text documents. PDF is recommended for in-browser viewing."
        fileInputRef={privacyFileInputRef}
        selectedFile={privacyFile}
        onFileChange={(event) => setPrivacyFile(event.target.files?.[0] || null)}
        onUpdate={() =>
          updateDocument({
            file: privacyFile,
            endpoint: `/api/settings/legal-documents/${LEGAL_DOCUMENT_KEYS.privacyPolicy}/`,
            setMeta: setPrivacyDocument,
            setFile: setPrivacyFile,
            fileInputRef: privacyFileInputRef,
            setSaving: setIsPrivacySaving,
            successMessage: "Privacy Policy updated.",
            emptyMessage: "Choose a Privacy Policy document first.",
            failureMessage: "Unable to update the Privacy Policy.",
          })
        }
        onDownload={async () => {
          try {
            await downloadLegalDocument(LEGAL_DOCUMENT_KEYS.privacyPolicy, privacyDocument?.filename);
          } catch (error) {
            showToast({ type: "error", message: error.message || "Unable to download the Privacy Policy." });
          }
        }}
        isSaving={isPrivacySaving}
        updateLabel="Update Privacy Policy"
      />

      <DocumentUploadCard
        icon={Scale}
        iconClassName="bg-sky-500/10 text-sky-300"
        title="Terms & Conditions"
        description="Shown on the signup page and at /terms. Upload the latest Terms & Conditions document for users to review."
        documentMeta={termsDocument}
        accept=".pdf,.doc,.docx,.txt"
        supportedText="Supported: PDF, Word, or text documents. PDF is recommended for in-browser viewing."
        fileInputRef={termsFileInputRef}
        selectedFile={termsFile}
        onFileChange={(event) => setTermsFile(event.target.files?.[0] || null)}
        onUpdate={() =>
          updateDocument({
            file: termsFile,
            endpoint: `/api/settings/legal-documents/${LEGAL_DOCUMENT_KEYS.termsConditions}/`,
            setMeta: setTermsDocument,
            setFile: setTermsFile,
            fileInputRef: termsFileInputRef,
            setSaving: setIsTermsSaving,
            successMessage: "Terms & Conditions updated.",
            emptyMessage: "Choose a Terms & Conditions document first.",
            failureMessage: "Unable to update the Terms & Conditions.",
          })
        }
        onDownload={async () => {
          try {
            await downloadLegalDocument(LEGAL_DOCUMENT_KEYS.termsConditions, termsDocument?.filename);
          } catch (error) {
            showToast({ type: "error", message: error.message || "Unable to download the Terms & Conditions." });
          }
        }}
        isSaving={isTermsSaving}
        updateLabel="Update Terms & Conditions"
      />

      <section className="mt-8 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Database size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Content insights scraper</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Fetch views and likes for pending or approved submissions belonging to active campaigns and gigs. URLs are scraped in batches of 20 in the background on the API (no Redis/Celery required), then results are saved and participants are notified.
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

            {(isRunning || lastRun) && (
              <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                {isRunning && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-zinc-400">{scrapeMessage || "Scraper running..."}</p>
                      <p className="font-semibold text-white">{Math.round(scrapeProgress)}%</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${Math.max(2, Math.min(100, scrapeProgress))}%` }}
                      />
                    </div>
                  </div>
                )}

                {lastRun && !isRunning && (
                  <>
                    <p className="text-emerald-400">
                      {lastRun.message || "Scraper completed."}
                      {typeof lastRun.progress === "number" ? ` (${lastRun.progress}%)` : ""}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-5">
                      <div><p className="text-zinc-500">Eligible</p><p className="mt-1 font-semibold">{lastRun.eligible ?? 0}</p></div>
                      <div><p className="text-zinc-500">Processed</p><p className="mt-1 font-semibold">{lastRun.processed ?? 0}</p></div>
                      <div><p className="text-zinc-500">Updated</p><p className="mt-1 font-semibold text-emerald-400">{lastRun.updated ?? 0}</p></div>
                      <div><p className="text-zinc-500">Notified</p><p className="mt-1 font-semibold text-sky-400">{lastRun.notified ?? 0}</p></div>
                      <div><p className="text-zinc-500">Failed</p><p className="mt-1 font-semibold text-amber-400">{lastRun.failed ?? 0}</p></div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
