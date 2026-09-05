import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { heroSlides } from "../../data/heroSlides";

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const previous =
    (current - 1 + heroSlides.length) % heroSlides.length;

  const next =
    (current + 1) % heroSlides.length;

  return (
    <div className="absolute inset-0 overflow-hidden">

      {/* LEFT PREVIEW */}
      <Slide
        slide={heroSlides[previous]}
        position="left"
      />

      {/* CENTER */}
      <AnimatePresence mode="wait">
        <motion.div
          key={heroSlides[current].id}
          initial={{
            opacity: 0,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.96,
          }}
          transition={{
            duration: 0.8,
          }}
          className="absolute left-1/2 top-1/2 h-[82%] w-[65%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[40px] border border-white/10"
        >
          <img
            src={heroSlides[current].image}
            alt={heroSlides[current].title}
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/60" />
        </motion.div>
      </AnimatePresence>

      {/* RIGHT PREVIEW */}
      <Slide
        slide={heroSlides[next]}
        position="right"
      />

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 gap-3">
        {heroSlides.map((_, index) => (
          <div
            key={index}
            className={`h-3 w-3 rounded-full transition-all ${
              index === current
                ? "bg-violet-500"
                : "bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Slide({ slide, position }) {
  return (
    <div
      className={`
        absolute
        top-1/2
        h-[72%]
        w-[34%]
        -translate-y-1/2
        overflow-hidden
        rounded-[32px]
        border
        border-white/10

        ${
          position === "left"
            ? "-left-[12%]"
            : "-right-[12%]"
        }
      `}
    >
      <img
        src={slide.image}
        alt={slide.title}
        className="h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-black/70" />
    </div>
  );
}