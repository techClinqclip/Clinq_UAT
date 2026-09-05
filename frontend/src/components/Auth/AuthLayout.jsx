export default function AuthLayout({ children }) {
    return (
      <div className="min-h-screen bg-[#07070B] relative overflow-hidden flex items-center justify-center px-6">
  
        {/* Background Glow */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
  
        {/* Card */}
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8">
          {children}
        </div>
  
      </div>
    );
  }