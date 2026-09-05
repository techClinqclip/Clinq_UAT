import SidebarSearch from "./SidebarSearch";
import TrendingCategories from "./TrendingCategories";
import PlatformStats from "./PlatformStats";
import TopEarners from "./TopEarners";
import TipCard from "./TipCard";
import CTACard from "./CTACard";

export default function RightSidebar({ campaigns = [] }) {
  return (
    <div className="space-y-6 p-6">
      <SidebarSearch />
      <PlatformStats campaigns={campaigns} />
      <TopEarners campaigns={campaigns} />
      <TrendingCategories campaigns={campaigns} />
      <TipCard />
      <CTACard />
    </div>
  );
}