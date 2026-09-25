import { API_BASE_URL } from "./api";

export const LEGAL_DOCUMENT_KEYS = {
  privacyPolicy: "privacy_policy",
  termsConditions: "terms_conditions",
};

const LEGAL_PAGE_PATHS = {
  [LEGAL_DOCUMENT_KEYS.privacyPolicy]: "/privacy",
  [LEGAL_DOCUMENT_KEYS.termsConditions]: "/terms",
};

export async function fetchLegalDocument(documentKey) {
  const response = await fetch(`${API_BASE_URL}/api/settings/legal-documents/${documentKey}/`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Unable to load the document.");
  }
  return data;
}

export async function openLegalDocument(documentKey) {
  const pagePath = LEGAL_PAGE_PATHS[documentKey];
  if (!pagePath) {
    throw new Error("Unknown legal document.");
  }

  // Always open the in-app viewer page so browsers display the file instead of
  // forcing a Save As dialog for Word/PDF downloads.
  window.open(pagePath, "_blank", "noopener,noreferrer");
}

export function getInlineDocumentViewerUrl(documentUrl, filename = "") {
  const url = String(documentUrl || "").trim();
  if (!url) return "";

  const lower = `${filename} ${url}`.toLowerCase();
  // Word/Excel/PowerPoint: open with Microsoft's in-browser viewer.
  if (/\.(doc|docx|xls|xlsx|ppt|pptx)(\b|$)/i.test(lower)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }

  // PDF and other types: Google viewer avoids forced downloads and X-Frame issues.
  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
}

export async function downloadPlatformDocument(path, filename = "document") {
  const token = localStorage.getItem("access_token") || localStorage.getItem("access") || "";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Unable to download the document.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadResourceSampleTemplate(filename = "Clinq_Event_Resourse_Template") {
  return downloadPlatformDocument(
    "/api/settings/resource-template/download/",
    filename,
  );
}

export async function downloadLegalDocument(documentKey, filename) {
  return downloadPlatformDocument(
    `/api/settings/legal-documents/${documentKey}/download/`,
    filename || documentKey,
  );
}
