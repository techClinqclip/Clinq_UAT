import { useEffect, useState, useCallback } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { api } from "../../lib/api";
import useToast from "../../hooks/useToast";
import ProcessingModal from "../../shared/ui/ProcessingModal"; // adjust path to your shared UI folder

export default function SubmitClipDialog({
  isOpen,
  onClose,
  campaignId,
  onSubmit,
}) {
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [url, setUrl] = useState("");
  const [campaignInfo, setCampaignInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  // ProcessingModal state for the initial campaign-info fetch
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadStepIndex, setLoadStepIndex] = useState(-1);
  const LOAD_STEPS = ["Loading campaign details"];

  // ProcessingModal state for the actual submit
  const [submitting, setSubmitting] = useState(false);
  const [submitStepIndex, setSubmitStepIndex] = useState(-1);
  const SUBMIT_STEPS = ["Submitting your clip"];

  // All available platforms
  const allPlatforms = [
    {
      id: "instagram",
      name: "Instagram",
      icon: <FaInstagram size={30} className="text-pink-500" />,
      usernamePlaceholder: "@yourhandle",
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: <FaYoutube size={30} className="text-red-500" />,
      usernamePlaceholder: "@yourchannel",
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: <FaTiktok size={30} className="text-white" />,
      usernamePlaceholder: "@yourhandle",
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: <FaFacebook size={30} className="text-blue-500" />,
      usernamePlaceholder: "Page name or @handle",
    },
    {
      id: "x",
      name: "X",
      icon: <FaXTwitter size={30} className="text-white" />,
      usernamePlaceholder: "@yourhandle",
    },
  ];

  // Load campaign info when dialog opens
  // Extracted so a "Try Again" button can call it directly, and so
  // reopening the dialog always re-fetches instead of relying purely on
  // the isOpen dependency (which won't re-fire if the dialog's parent
  // stays mounted across a navigation and isOpen never actually flips
  // back to false in between opens).
  const loadCampaignInfo = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    setShowLoadingModal(true);
    setLoadStepIndex(0);
    try {
      const data = await api(`/api/content/campaigns/${campaignId}/submission-info/`);
      setCampaignInfo(data);
      setPlatform("");
      setUsername("");
      setUrl("");
      setLoadStepIndex(1); // marks done -> ProcessingModal fires onComplete
    } catch (err) {
      setError(err?.message || "Unable to load campaign details.");
      setShowLoadingModal(false);
      setLoadStepIndex(-1);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Load campaign info when dialog opens; fully reset state when it
  // closes so the next open always starts clean instead of showing a
  // stale error or stale campaign data from the previous open.
  useEffect(() => {
    if (!isOpen) {
      setCampaignInfo(null);
      setError(null);
      setPlatform("");
      setUsername("");
      setUrl("");
      setShowLoadingModal(false);
      setLoadStepIndex(-1);
      return;
    }

    loadCampaignInfo();
  }, [isOpen, campaignId, loadCampaignInfo]);
  // Filter platforms to only allowed ones
  const allowedPlatforms = campaignInfo
    ? allPlatforms.filter(
      (p) =>
        campaignInfo.allowedPlatforms &&
        campaignInfo.allowedPlatforms.includes(p.name)
    )
    : allPlatforms;

  const platformDomains = {
    instagram: ["instagram.com"],
    youtube: ["youtube.com", "youtu.be"],
    facebook: ["facebook.com", "fb.watch"],
    x: ["x.com", "twitter.com"],
  };

  const selectedPlatform = allowedPlatforms.find((item) => item.id === platform);

  const isValidPlatformUrl = (url, platform) => {
    try {
      const hostname = new URL(url).hostname.replace("www.", "");
      return platformDomains[platform]?.some((domain) =>
        hostname.endsWith(domain)
      );
    } catch {
      return false;
    }
  };

  const handleSelectPlatform = (id) => {
    setPlatform(id);
    setUsername("");
  };

  const handleSubmit = async () => {
    if (!platform || !username.trim() || !url.trim()) return;
    if (!isValidPlatformUrl(url.trim(), platform)) {
      showToast({
        type: "error",
        title: "Invalid URL",
        message: `Please enter a valid ${selectedPlatform?.name || platform} URL.`,
      });
      return;
    }

    setSubmitting(true);
    setSubmitStepIndex(0);

    try {
      // NOTE: onSubmit (the parent's handleSubmitClip) currently catches its
      // own errors internally and shows a toast rather than rethrowing —
      // so this await will resolve even if the underlying API call failed.
      // The processing modal will show "done" regardless of outcome; the
      // parent's toast is what actually surfaces success/failure right now.
      await onSubmit({
        campaignId: campaignId,
        platform,
        username: username.trim(),
        url: url.trim(),
      });
      setSubmitStepIndex(1); // marks done -> ProcessingModal fires onComplete
    } catch (err) {
      setSubmitting(false);
      setSubmitStepIndex(-1);
      showToast({
        type: "error",
        title: "Submission failed",
        message: err?.message || "Something went wrong submitting your clip. Please try again.",
      });
    }
  };

  if (!isOpen) return null;

  const isInCooldown = campaignInfo?.cooldown?.is_in_cooldown;
  const hoursRemaining = campaignInfo?.cooldown?.hours_remaining || 0;
  const lastStatus = campaignInfo?.cooldown?.last_submission_status;
  const isCampaignClosed = campaignInfo?.campaign?.isClosed || false;
  const maxEarnings = campaignInfo?.campaign?.maxEarnings || 0;
  const currentEarnings = campaignInfo?.campaign?.currentEarnings || 0;
  const remainingCapacity = campaignInfo?.campaign?.remainingCapacity;
  const campaignEndDate = campaignInfo?.campaign?.endDate;
  const hasMaxEarningsReached = maxEarnings > 0 && remainingCapacity !== null && remainingCapacity <= 0;

  const getStatusDisplay = (status) => {
    if (!status) return "Pending";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-white/10 p-7">
            <div>
              <h2 className="text-2xl font-bold text-white">Submit Clip</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Share your published content for review.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="custom-scrollbar space-y-8 overflow-y-auto p-5 sm:p-7">
            {loading && !error && (
              <div className="animate-pulse space-y-4">
                <div className="h-12 rounded-2xl bg-white/5" />
                <div className="h-24 rounded-2xl bg-white/5" />
                <div className="h-32 rounded-2xl bg-white/5" />
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={loadCampaignInfo}
                  className="mt-3 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && campaignInfo && (
              <>
                {/* Campaign Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Campaign / Gig
                  </label>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
                    {campaignInfo.campaignName}
                  </div>
                </div>

                {/* Campaign Closed Alert */}
                {isCampaignClosed && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-400">
                        Campaign Closed
                      </p>
                      <p className="mt-1 text-sm text-red-300/80">
                        This campaign has ended and is no longer accepting new submissions. {campaignEndDate && `Ended on ${new Date(campaignEndDate).toLocaleDateString()}.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Max Earnings Reached Alert */}
                {hasMaxEarningsReached && (
                  <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-400">
                        Maximum Earnings Reached
                      </p>
                      <p className="mt-1 text-sm text-orange-300/80">
                        This campaign has reached its maximum earnings capacity of ₹{maxEarnings?.toLocaleString()}. You cannot submit additional content for this campaign.
                      </p>
                    </div>
                  </div>
                )}

                {/* Earnings Info (if not at max) */}
                {/* {!hasMaxEarningsReached && maxEarnings > 0 && remainingCapacity !== null && (
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Max Earnings</p>
                        <p className="mt-1 text-lg font-semibold text-violet-400">₹{maxEarnings?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Your Earnings</p>
                        <p className="mt-1 text-lg font-semibold text-white">₹{currentEarnings?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Remaining</p>
                        <p className="mt-1 text-lg font-semibold text-green-400">₹{remainingCapacity?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )} */}

                {/* Cooling Period Alert */}
                {isInCooldown && (
                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-400">
                        Cooling Period Active
                      </p>
                      <p className="mt-1 text-sm text-yellow-300/80">
                        Your last submission ({getStatusDisplay(lastStatus)}) is still in cooling period.
                        You can submit again in {Math.ceil(hoursRemaining)} hour{Math.ceil(hoursRemaining) !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Platform Selection */}
                <div>
                  <label className="mb-4 block text-sm font-medium text-zinc-300">
                    Select Platform
                    {allowedPlatforms.length < allPlatforms.length && (
                      <span className="text-zinc-500">
                        {" "}({allowedPlatforms.length} available)
                      </span>
                    )}
                  </label>

                  {allowedPlatforms.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {allowedPlatforms.map((item) => {
                        const active = platform === item.id;
                        const isDisabled = isInCooldown || isCampaignClosed || hasMaxEarningsReached;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => handleSelectPlatform(item.id)}
                            disabled={isDisabled}
                            className={`relative rounded-2xl border p-6 transition-all ${active
                                ? "border-violet-500 bg-violet-500/10"
                                : "border-white/10 bg-black/20 hover:border-violet-500/40"
                              } ${isDisabled
                                ? "cursor-not-allowed opacity-50"
                                : ""
                              }`}
                          >
                            {active && (
                              <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                            <div className="flex flex-col items-center gap-4">
                              {item.icon}
                              <span className="font-medium text-white">{item.name}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-zinc-400">
                      No platforms allowed for this campaign.
                    </div>
                  )}
                </div>

                {selectedPlatform && !isInCooldown && !isCampaignClosed && !hasMaxEarningsReached && (
                  <>
                    {/* Username Input */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">
                        {selectedPlatform.name} Username
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={selectedPlatform.usernamePlaceholder}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition-all placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>

                    {/* URL Input */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">
                        {selectedPlatform.name} URL
                      </label>
                      <input
                        type="url"
                        autoComplete="off"
                        spellCheck={false}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/post"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition-all placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      isInCooldown ||
                      isCampaignClosed ||
                      hasMaxEarningsReached ||
                      submitting ||
                      !platform ||
                      !username.trim() ||
                      !url.trim()
                    }
                    className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-700/40 disabled:text-zinc-400"
                    title={
                      isCampaignClosed
                        ? "Campaign is closed"
                        : hasMaxEarningsReached
                          ? "Maximum earnings reached"
                          : isInCooldown
                            ? "Cooling period active"
                            : undefined
                    }
                  >
                    {isCampaignClosed
                      ? "Campaign Closed"
                      : hasMaxEarningsReached
                        ? "Max Earnings Reached"
                        : isInCooldown
                          ? "Cooling Period Active"
                          : submitting
                            ? "Submitting…"
                            : "Submit Clip"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ProcessingModal
        isOpen={showLoadingModal}
        mode="controlled"
        title="Loading campaign details"
        steps={LOAD_STEPS}
        currentStepIndex={loadStepIndex}
        onComplete={() => {
          setShowLoadingModal(false);
          setLoadStepIndex(-1);
        }}
      />

      <ProcessingModal
        isOpen={submitting}
        mode="controlled"
        title="Submitting your clip"
        steps={SUBMIT_STEPS}
        currentStepIndex={submitStepIndex}
        onComplete={() => {
          setSubmitting(false);
          setSubmitStepIndex(-1);
        }}
      />
    </>
  );
}