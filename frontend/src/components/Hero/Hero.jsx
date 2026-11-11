import HeroBackground from "./HeroBackground";
import HeroContent from "./HeroContent";

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-surface-0">
      <HeroBackground />
      <HeroContent />
    </section>
  );
}