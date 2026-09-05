import HeroBackground from "./HeroBackground";
import BannerCarousel from "./BannerCarousel";

export default function HeroSection({ campaigns = [], loading = false }) {
  return (
    <section className="relative">
      <HeroBackground />
      <div className="relative z-10 space-y-8">
        <BannerCarousel campaigns={campaigns} loading={loading} />
      </div>
    </section>
  );
}