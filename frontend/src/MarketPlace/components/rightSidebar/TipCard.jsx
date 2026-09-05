import { Lightbulb } from "lucide-react";
import SidebarCard from "./SidebarCard";

export default function TipCard() {
  return (
    <SidebarCard title="Tip of the Day" icon={Lightbulb} accentClass="text-amber-400">
      <p className="text-sm leading-7 text-zinc-400">
        Campaigns with videos under 30 seconds typically receive higher engagement.
        Keep your hook strong and your message clear.
      </p>
    </SidebarCard>
  );
}