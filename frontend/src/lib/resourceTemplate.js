import { API_BASE_URL } from "./api";

export const LEGAL_DOCUMENT_KEYS = {
  privacyPolicy: "privacy_policy",
  termsConditions: "terms_conditions",
};

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
