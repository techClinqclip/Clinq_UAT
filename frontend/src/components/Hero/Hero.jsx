import HeroBackground from "./HeroBackground";
import HeroContent from "./HeroContent";

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#07070B]">
      <HeroBackground />
      <HeroContent />
    </section>
  );
}