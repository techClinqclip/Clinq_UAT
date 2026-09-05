import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function CarouselControls({
  total,
  current,
  next,
  prev,
  goTo,
}) {
  return (
    <>
      {/* Chevrons only show from sm and up — on narrow phone widths there
          isn't enough horizontal room to keep them clear of the content
          column at all, and swiping/tapping the dots covers navigation
          fine on touch anyway. */}
      <button
        type="button"
        onClick={prev}
        className="absolute bottom-6 left-4 z-20 hidden rounded-full border border-white/10 bg-black/50 p-2.5 text-white shadow-lg backdrop-blur transition hover:bg-black/70 sm:flex sm:bottom-8 sm:left-5 sm:p-3"
      >
        <ChevronLeft size={18} className="sm:hidden" />
        <ChevronLeft size={20} className="hidden sm:block" />
      </button>

      <button
        type="button"
        onClick={next}
        className="absolute bottom-6 right-4 z-20 hidden rounded-full border border-white/10 bg-black/50 p-2.5 text-white shadow-lg backdrop-blur transition hover:bg-black/70 sm:flex sm:bottom-8 sm:right-5 sm:p-3"
      >
        <ChevronRight size={18} className="sm:hidden" />
        <ChevronRight size={20} className="hidden sm:block" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-8 sm:gap-3">

        {Array.from({ length: total }).map((_, index) => (

          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all sm:h-2 ${
              current === index
                ? "w-6 bg-white sm:w-8"
                : "w-1.5 bg-white/40 hover:bg-white/60 sm:w-2"
            }`}
          />

        ))}

      </div>
    </>
  );
}