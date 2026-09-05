export default function HeroBackground() {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
  
        {/* Background Glow */}
        <div className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[180px]" />
  
        {/* LEFT BANNER */}
        <img
          src="/hero/podcast.jpg"
          alt="podcast Campaign"
          className="
            absolute
            left-[-20px]
            top-24
            h-[660px]
            w-[460px]
            rounded-[42px]
            object-cover
            opacity-70
            shadow-2xl
            rotate-[-6deg]
            border
            border-white/10
          "
        />
  
        {/* CENTER BANNER */}
        <img
          src="/hero/gaming.jpg"
          alt="Gaming Campaign"
          className="
            absolute
            left-1/2
            top-16
            h-[860px]
            w-[720px]
            -translate-x-1/2
            rounded-[48px]
            object-cover
            shadow-[0_40px_120px_rgba(0,0,0,.6)]
            border
            border-white/10
          "
        />
  
        {/* RIGHT BANNER */}
        <img
          src="/hero/fitness.jpg"
          alt="Fitness Campaign"
          className="
            absolute
            right-[-20px]
            top-24
            h-[660px]
            w-[460px]
            rounded-[42px]
            object-cover
            opacity-70
            shadow-2xl
            rotate-[6deg]
            border
            border-white/10
          "
        />
  
        {/* Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/55 to-[#07070B]" />
  
        {/* Side Fade */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#07070B] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#07070B] to-transparent" />
      </div>
    );
  }