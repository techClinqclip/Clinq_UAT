import HeroBackground from "./HeroBackground";
import BannerCarousel from "./BannerCarousel";

export default function HeroSection({ campaigns = [], loading = false, error = null, onRetry }) {
  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      <div className="relative z-10 space-y-8">
        <BannerCarousel campaigns={campaigns} loading={loading} error={error} onRetry={onRetry} />
      </div>
    </section>
  );
}