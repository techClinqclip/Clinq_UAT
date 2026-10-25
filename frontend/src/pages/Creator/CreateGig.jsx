import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import CampaignForm from "../CampaignForm";
import { api } from "../../lib/api";
export default function CreateGig() {
  const navigate = useNavigate();
  const createdKeyRef = useRef(null);

  const handleCreate = async (formData) => {
    const payload = {
      name: formData.name,
      category: formData.category?.toLowerCase() || "",
      description: formData.description || "",
      clipperRequirements: formData.clipperRequirements || "",
      budget: formData.budget || 0,
      rewardPer1k: formData.rewardPer1k || 0,
      maxEarnings: formData.maxEarnings || 0,
      platforms: formData.platforms || [],
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      thumbnail: formData.thumbnail || null,
      resources: formData.resources || [],  // ✓ Added resources
      // Gig-specific fields (optional for consolidation)
      highlightType: "none",
      isPaidListing: false,
      isBiddable: false,
      // Type will be auto-set to 'gig' by backend based on user role
    };

    try {
      const created = await api("/api/content/campaigns/", {
        method: "POST",
        body: payload,
      });
      createdKeyRef.current = created.accessKey;
    } catch (error) {
      console.error("Create gig failed", error);
      throw error;
    }
  };

  return (
    <div className="space-y-8">
      <Link
        to="/creator/gigs"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Gigs
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-white">Create Gig</h1>
        <p className="mt-2 text-zinc-400">
          Set up a new gig for creators to join.
        </p>
      </div>

      <CampaignForm
        mode="create"
        kind="gig"
        onSubmit={handleCreate}
        onSuccess={() => navigate(`/creator/gigs/${createdKeyRef.current}`)}
      />
    </div>
  );
}
