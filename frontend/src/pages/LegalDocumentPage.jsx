import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import Navbar from "../components/Hero/Navbar";
import Footer from "../components/Footer/Footer";
import { API_BASE_URL } from "../lib/api";
import { downloadLegalDocument } from "../lib/resourceTemplate";

function isPdfDocument(documentMeta) {
  const name = String(documentMeta?.filename || documentMeta?.documentUrl || "").toLowerCase();
  return name.includes(".pdf");
}

export default function LegalDocumentPage({
  documentKey,
  title,
  description,
}) {
  const [documentMeta, setDocumentMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/settings/legal-documents/${documentKey}/`,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.detail || `Unable to load ${title}.`);
        }
        if (!cancelled) setDocumentMeta(data);
      } catch (loadError) {
        if (!cancelled) {
          setDocumentMeta(null);
          setError(loadError.message || `Unable to load ${title}.`);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDocument();
    return () => {
      cancelled = true;
    };
  }, [documentKey, title]);

  const canEmbedPdf = useMemo(
    () => Boolean(documentMeta?.documentUrl) && isPdfDocument(documentMeta),
    [documentMeta],
  );

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadLegalDocument(documentKey, documentMeta?.filename || title);
    } catch (downloadError) {
      setError(downloadError.message || `Unable to download ${title}.`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                Legal
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
            </div>
            {documentMeta?.documentUrl ? (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isDownloading ? "Downloading..." : "Download"}
              </button>
            ) : null}
          </div>

          <div className="mt-8">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                Loading document...
              </div>
            ) : error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : !documentMeta?.documentUrl ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-6 text-sm text-amber-200">
                This document has not been uploaded yet. Please check back soon.
              </div>
            ) : canEmbedPdf ? (
              <iframe
                title={title}
                src={documentMeta.documentUrl}
                className="h-[75vh] w-full rounded-2xl border border-white/10 bg-black"
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center">
                <FileText className="mx-auto text-violet-300" size={28} />
                <p className="mt-3 text-sm text-zinc-300">
                  Preview is available for PDF files. Download <span className="font-medium text-white">{documentMeta.filename}</span> to review this document.
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download document
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
