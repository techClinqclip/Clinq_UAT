import {
    FaInstagram,
    FaYoutube,
    FaFacebook,
    FaXTwitter,
  } from "react-icons/fa6";
  import { FiGlobe } from "react-icons/fi";
  
  const icons = {
    Instagram: FaInstagram,
    YouTube: FaYoutube,
    Facebook: FaFacebook,
    X: FaXTwitter,
  };
  
  export default function PlatformBreakdown({ platforms = [] }) {
    return (
      <section className="h-full rounded-3xl border border-white/10 bg-[#11111A] p-8">
        {/* Header */}
  
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Platform Breakdown
          </h2>
  
          <p className="mt-2 text-zinc-400">
            Distribution of views across supported platforms.
          </p>
        </div>
  
        {/* Platforms */}
  
        <div className="space-y-6">
          {platforms.map((platform) => {
            const Icon = icons[platform.platform] || FiGlobe;
  
            return (
              <div key={platform.platform}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-500/10 p-2">
                      <Icon
                        size={18}
                        className="text-violet-400"
                      />
                    </div>
  
                    <div>
                      <p className="font-medium text-white">
                        {platform.platform}
                      </p>
  
                      <p className="text-sm text-zinc-500">
                        {platform.views} Views
                      </p>
                    </div>
                  </div>
  
                  <span className="font-semibold text-violet-400">
                    {platform.percentage}%
                  </span>
                </div>
  
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full rounded-r-full bg-violet-500 transition-all duration-700"
                    style={{
                      width: `${platform.percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }
