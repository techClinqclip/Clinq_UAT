import {
    summary,
    viewsData,
    earningsData,
    performanceData,
    topClippers,
    platformBreakdown,
    milestones,
  } from "../mock/analyticsData";
  
  const delay = (ms = 400) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  
  export const analyticsService = {
    /**
     * Simulates fetching the complete analytics dashboard.
     * Later this will become:
     * GET /creator/analytics?range=30d
     */
    async getAnalytics(range = "30d") {
      await delay();
  
      // For now we're ignoring the range and returning mock data.
      // Once the backend is ready, this method will make the API call.
  
      return {
        summary,
        viewsData,
        earningsData,
        performanceData,
        topClippers,
        platformBreakdown,
        milestones,
      };
    },
  };
