import { featuredCampaigns } from "./featuredCampaignData";

// Reuse featured items + spread in more as your real list grows.
// Swap this for a real API call later — the component below is already
// paginated client-side, so wiring a backend just means replacing
// this export with a fetch result.
export const allCampaigns = [...featuredCampaigns];