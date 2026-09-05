const LOCAL_DEV_HOST_PATTERN = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

export function resolveImageUrl(url, baseUrl = null) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;

  const configuredBaseUrl = typeof baseUrl === "string" && baseUrl.trim()
    ? baseUrl.trim()
    : (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL)
      ? import.meta.env.VITE_API_BASE_URL
      : null;

  const currentOrigin = typeof window !== "undefined" ? window.location?.origin : null;
  const fallbackBaseUrl = configuredBaseUrl || (
    currentOrigin && (!import.meta.env?.DEV || !LOCAL_DEV_HOST_PATTERN.test(currentOrigin))
      ? currentOrigin
      : "http://localhost:8000"
  );

  const normalizedBaseUrl = String(fallbackBaseUrl || "").replace(/\/+$/, "");
  return `${normalizedBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}
