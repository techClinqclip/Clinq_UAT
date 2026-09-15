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
      <button
        type="button"
        onClick={prev}
        aria-label="Previous campaign"
        className="absolute bottom-4 left-3 z-20 flex items-center justify-center rounded-full border border-white/10 bg-black/50 p-2 text-white shadow-lg backdrop-blur transition hover:bg-black/70 sm:bottom-8 sm:left-5 sm:p-3"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        type="button"
        onClick={next}
        aria-label="Next campaign"
        className="absolute bottom-4 right-3 z-20 flex items-center justify-center rounded-full border border-white/10 bg-black/50 p-2 text-white shadow-lg backdrop-blur transition hover:bg-black/70 sm:bottom-8 sm:right-5 sm:p-3"
      >
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-8 sm:gap-3">
        {Array.from({ length: total }).map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Go to campaign ${index + 1}`}
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