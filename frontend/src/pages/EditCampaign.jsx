import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CampaignForm from "./CampaignForm";
import { api } from "../lib/api";
import ContentLoader from "../shared/ui/ContentLoader";

export default function EditCampaign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [existingCampaign, setExistingCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCampaign = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const data = await api(`/api/content/campaigns/${id}/`);
        if (!mounted) return;

        const mapped = {
          name: data.name || "",
          category: data.category || "Entertainment",
          description: data.description || "",
          clipperRequirements: data.clipperRequirements || "",
          budget: data.budget || "",
          rewardPer1k: data.rewardPer1k || "",
          maxEarnings: data.maxEarnings || "",
          platforms: data.platforms || [],
          resources: data.resources || [],
          startDate: (data.startDate || data.start_date)?.split("T")[0] || "",
          endDate: (data.endDate || data.end_date)?.split("T")[0] || "",
          thumbnail: data.thumbnailUrl || data.thumbnail || null,
        };

        setExistingCampaign(mapped);
      } catch (error) {
        console.error("Failed to load campaign for edit", error);
        if (mounted) setLoadError(error?.message || "Unable to load campaign details.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadCampaign();

    return () => {
      mounted = false;
    };
  }, [id]);

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
        platforms: formData.platforms || [],
        resources: formData.resources || [],
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        thumbnail: formData.thumbnail || null,
      };

      await api(`/api/content/campaigns/${id}/`, {
        method: "PATCH",
        body: payload,
      });

      navigate(`/brand/campaigns/${id}`);
    } catch (error) {
      console.error("Update campaign failed", error);
      alert(error.message || "Unable to update campaign. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Link to={`/brand/campaigns/${id}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white">
          <ArrowLeft size={18} />
          Back to Campaign
        </Link>
        <ContentLoader message="Loading campaign details..." />
      </div>
    );
  }

  if (!existingCampaign) {
    return (
      <div className="space-y-4">
        <Link
          to={`/brand/campaigns/${id}`}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          Back to Campaign
        </Link>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-red-400">
          {loadError || "Unable to load campaign details."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to={`/brand/campaigns/${id}`}
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Campaign
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-white">Edit Campaign</h1>
        <p className="mt-2 text-zinc-400">Update your campaign&apos;s details.</p>
      </div>

      <CampaignForm mode="edit" initialData={existingCampaign} onSubmit={handleUpdate} />
    </div>
  );
}
