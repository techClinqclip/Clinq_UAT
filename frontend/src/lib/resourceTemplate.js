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
  // Open synchronously inside the click handler so popup blockers allow it.
  const popup = window.open("about:blank", "_blank");

  try {
    const data = await fetchLegalDocument(documentKey);
    const documentUrl = String(data?.documentUrl || "").trim();
    if (documentUrl) {
      if (popup) {
        popup.opener = null;
        popup.location.replace(documentUrl);
      } else {
        window.location.assign(documentUrl);
      }
      return data;
    }

    const fallbackPath = LEGAL_PAGE_PATHS[documentKey];
    if (fallbackPath) {
      if (popup) {
        popup.opener = null;
        popup.location.replace(fallbackPath);
      } else {
        window.open(fallbackPath, "_blank", "noopener,noreferrer");
      }
      throw new Error("This document has not been uploaded yet.");
    }

    if (popup) popup.close();
    throw new Error("This document has not been uploaded yet.");
  } catch (error) {
    // Keep the fallback legal page open when the file itself is missing.
    const message = String(error?.message || "");
    const isMissingUpload = message.includes("has not been uploaded yet");
    if (popup && !popup.closed && !isMissingUpload) {
      try {
        popup.close();
      } catch {
        // Ignore close failures from cross-origin timing.
      }
    }
    throw error;
  }
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

export async function downloadResourceSampleTemplate(filename = "resource-sample-template") {
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
