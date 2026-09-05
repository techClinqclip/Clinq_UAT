import Section from "./section/Section";

export default function LatestCampaigns() {
  return (
    <Section
      title="Latest Campaigns"
      subtitle="Recently launched opportunities."
    >
      <div className="h-72 rounded-3xl border border-dashed border-zinc-700 flex items-center justify-center text-zinc-500">
        Latest Campaigns
      </div>
    </Section>
  );
}