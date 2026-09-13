import { API_BASE_URL } from "./api";

export async function downloadResourceSampleTemplate(filename = "resource-sample-template") {
  const token = localStorage.getItem("access_token") || localStorage.getItem("access") || "";
  const response = await fetch(`${API_BASE_URL}/api/settings/resource-template/download/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Unable to download the resource sample template.");
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
