import { useEffect, useState } from "react";
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
  const [filters, setFilters] = useState(defaultFilters);

  // Only show the full LoadingScreen once per browser session (e.g. right
  // after login/signup). On later visits to /marketplace within the same
  // session — nav clicks, coming back from a campaign page — skip straight
  // to rendering instead of replaying the whole animation every time.
  const [showLoader, setShowLoader] = useState(
    () => !sessionStorage.getItem(LOADER_SEEN_KEY)
  );

  useEffect(() => {
    let mounted = true;

    async function loadCampaigns() {
      try {
        const response = await api("/api/content/campaigns/?scope=marketplace");
        const nextCampaigns = Array.isArray(response) ? response : response?.results || [];
        if (mounted) setCampaigns(nextCampaigns);
      } catch {
        if (mounted) setCampaigns([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCampaigns();
    return () => {
      mounted = false;
    };
  }, []);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

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
        <MarketplaceLayout role={user?.role || "creator"} campaigns={campaigns}>
         <HeroSection campaigns={campaigns} loading={loading} />
          <DiscoveryToolbar filters={filters} onFilterChange={updateFilter} />

          <div className="mt-12">
            <FeaturedCampaigns campaigns={campaigns} loading={loading} />
          </div>
          <div className="mt-16">
            <AllCampaigns campaigns={campaigns} filters={filters} loading={loading} />
          </div>
        </MarketplaceLayout>
      )}
    </>
  );
}