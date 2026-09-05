import Section from "./section/Section";

export default function FeaturedBrands() {
  return (
    <Section
      title="Featured Brands"
      subtitle="Trusted brands creating opportunities."
    >
      <div className="h-72 rounded-3xl border border-dashed border-zinc-700 flex items-center justify-center text-zinc-500">
        Featured Brands
      </div>
    </Section>
  );
}