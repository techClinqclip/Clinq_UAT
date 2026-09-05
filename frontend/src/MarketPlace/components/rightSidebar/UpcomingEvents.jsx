import { CalendarClock } from "lucide-react";
import SidebarCard from "./SidebarCard";
import { upcomingEvents } from "./sidebarData";

export default function UpcomingEvents() {
  return (
    <SidebarCard title="Upcoming Events" icon={CalendarClock}>
      <div className="space-y-3">
        {upcomingEvents.map((event) => (
          <div key={event.title} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
            <h4 className="font-medium text-white">{event.title}</h4>
            <p className="text-sm text-zinc-400">{event.date}</p>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}