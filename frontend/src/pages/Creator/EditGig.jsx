import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CampaignForm from "../CampaignForm";
import { api } from "../../lib/api";
import ContentLoader from "../../shared/ui/ContentLoader";

export default function EditGig() {
  const { id: accessKey } = useParams();
  const navigate = useNavigate();
  const [existingGig, setExistingGig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Use unified campaign endpoint for gigs
        const data = await api(`/api/content/campaigns/${accessKey}/`);
        if (!mounted) return;

        const mapped = {
          name: data.name || data.title || "",
          category: data.category || "Entertainment",
          description: data.description || "",
          clipperRequirements: data.clipperRequirements || data.requirements || "",
          budget: data.budget || "",
          rewardPer1k: data.rewardPer1k || data.reward_per_1k || "",
          maxEarnings: data.maxEarnings || data.max_earnings || data.max_earnings_per_clipper || "",
          platforms: data.platforms || [],
          resources: data.resources || [],
          startDate: (data.startDate || data.start_date)?.split("T")[0] || "",
          endDate: (data.endDate || data.end_date)?.split("T")[0] || "",
          thumbnail: data.thumbnailUrl || data.thumbnail || null,
        };

        setExistingGig(mapped);
        setLoadError("");
      } catch (err) {
        console.error("Failed to load gig", err);
        if (mounted) setLoadError(err?.message || "Unable to load gig details.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [accessKey]);

  const handleUpdate = async (formData) => {
    try {
      const payload = {
        name: formData.name,
        category: formData.category?.toLowerCase() || "",
        description: formData.description || "",
        clipperRequirements: formData.clipperRequirements || "",
        budget: formData.budget || 0,
        rewardPer1k: formData.rewardPer1k || 0,
        maxEarnings: formData.maxEarnings || 0,
        platforms: formData.platforms,
        resources: formData.resources,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        thumbnail: formData.thumbnail || null,  // ✓ Added thumbnail field
      };

      await api(`/api/content/campaigns/${accessKey}/`, {
        method: "PATCH",
        body: payload,
      });

      navigate(`/creator/gigs/${accessKey}`);
    } catch (error) {
      console.error("Update gig failed", error);
      alert(error.message || "Unable to update gig. Please try again.");
    }
  };

  if (isLoading) {
    return <ContentLoader message="Loading gig…" />;
  }

  if (!existingGig) {
    return (
      <div className="space-y-4">
        <Link
          to={`/creator/gigs/${accessKey}`}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          Back to Gig
        </Link>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-red-400">
          {loadError || "Unable to load gig details."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to={`/creator/gigs/${accessKey}`}
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Gig
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-white">Edit Gig</h1>
        <p className="mt-2 text-zinc-400">Update your gig's details.</p>
      </div>

      <CampaignForm mode="edit" initialData={existingGig} onSubmit={handleUpdate} />
    </div>
  );
}
