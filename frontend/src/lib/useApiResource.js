import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Replaces the loading/error/refetch boilerplate every page currently
 * duplicates by hand. Pairs naturally with <ErrorState />.
 *
 * Usage:
 *   const { data: gigs, loading, error, refetch } = useApiResource(
 *     () => api("/api/content/campaigns/clipper-gigs/"),
 *     [],            // deps — refetches when these change, same as useEffect
 *     { initialData: [] }
 *   );
 *
 *   if (loading) return <MarketplaceLoadingSkeleton />;
 *   if (error) return <ErrorState error={error} onRetry={refetch} />;
 *   // render gigs
 */
export function useApiResource(fetcher, deps = [], { initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, setData, loading, error, refetch };
}