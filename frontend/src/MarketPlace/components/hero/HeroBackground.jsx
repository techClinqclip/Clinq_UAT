export default function HeroBackground() {
    return (
      <>
        {/* Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#141423] via-[#0F0F17] to-[#09090F]" />
  
        {/* Top Left Glow */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[140px]" />
  
        {/* Bottom Right Glow */}
        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/10 blur-[160px]" />
  
        {/* Center Glow */}
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/5 blur-[120px]" />
  
        {/* Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,.15) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
  
        {/* Radial Fade */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_0%,rgba(9,9,15,0.35)_55%,rgba(9,9,15,0.9)_100%)]" />
      </>
    );
  }