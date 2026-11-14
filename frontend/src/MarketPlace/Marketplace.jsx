import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MarketplaceLayout from "./components/layout/MarketplaceLayout";
import HeroSection from "./components/hero/HeroSection";
import DiscoveryToolbar from "./components/discovery/DiscoveryToolbar";
import FeaturedCampaigns from "./FeaturedCampaigns";
import AllCampaigns from "./AllCampaigns";
import LoadingScreen from "../shared/ui/LoadingScreen";
import useCurrentUser from "../hooks/useCurrentUser";
import { api } from "../lib/api";

const defaultFilters = {
  search: "",
  status: "all",
  category: "all",
  reward: "all",
  sort: "newest",
  platform: "All",
};

const LOADER_SEEN_KEY = "marketplace_loader_seen";

export default function Marketplace() {
  const user = useCurrentUser();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [fetchKey, setFetchKey] = useState(0);

  const filters = {
    search: searchParams.get("search") ?? defaultFilters.search,
    status: searchParams.get("status") ?? defaultFilters.status,
    category: searchParams.get("category") ?? defaultFilters.category,
    reward: searchParams.get("reward") ?? defaultFilters.reward,
    sort: searchParams.get("sort") ?? defaultFilters.sort,
    platform: searchParams.get("platform") ?? defaultFilters.platform,
  };

  // Only show the full LoadingScreen once per browser session (e.g. right
  // after login/signup). On later visits to /marketplace within the same
  // session — nav clicks, coming back from a campaign page — skip straight
  // to rendering instead of replaying the whole animation every time.
  const [showLoader, setShowLoader] = useState(
    () => !sessionStorage.getItem(LOADER_SEEN_KEY)
  );

  useEffect(() => {
    let mounted = true;

    // Hard cap: if the API never resolves (server down, network hang),
    // force loading=false after 12s so the LoadingScreen isn't stuck forever.
    const maxWait = setTimeout(() => {
      if (mounted) {
        mounted = false; // prevent a late successful response from clearing this error
        setLoading(false);
        setError("Request timed out. Please check your connection and try again.");
      }
    }, 12000);

    async function loadCampaigns() {
      try {
        const response = await api("/api/content/campaigns/?scope=marketplace");
        const nextCampaigns = Array.isArray(response) ? response : response?.results || [];
        if (mounted) {
          setCampaigns(nextCampaigns);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setCampaigns([]);
          setError(err?.message || "Failed to load campaigns. Please try again.");
        }
      } finally {
        clearTimeout(maxWait);
        if (mounted) setLoading(false);
      }
    }

    loadCampaigns();
    return () => {
      mounted = false;
      clearTimeout(maxWait);
    };
  }, [fetchKey]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setCampaigns([]);
    setFetchKey((k) => k + 1);
  };

  const updateFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === defaultFilters[key]) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  };

  const clearFilters = () => setSearchParams({});

  const handleLoaderFinish = () => {
    sessionStorage.setItem(LOADER_SEEN_KEY, "1");
    setShowLoader(false);
  };

  return (
    <>
      {showLoader && (
        <LoadingScreen
          isReady={!loading}
          messages={["Setting things up...", "Loading your marketplace...", "Fetching campaigns..."]}
          onFinish={handleLoaderFinish}
        />
      )}

      {!showLoader && (
       <MarketplaceLayout
       role={user?.role}
       campaigns={campaigns}
       loading={loading}
       onFilterChange={updateFilter}
       activeCategory={filters.category}
     >
         <HeroSection campaigns={campaigns} loading={loading} error={error} onRetry={handleRetry} />
          <DiscoveryToolbar filters={filters} onFilterChange={updateFilter} />

          <div className="mt-12">
            <FeaturedCampaigns campaigns={campaigns} loading={loading} error={error} onRetry={handleRetry} />
          </div>
          <div className="mt-16">
            <AllCampaigns campaigns={campaigns} filters={filters} loading={loading} error={error} onRetry={handleRetry} onClearFilters={clearFilters} />
          </div>
        </MarketplaceLayout>
      )}
    </>
  );
}