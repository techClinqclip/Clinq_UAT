import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import CampaignForm from "../CampaignForm";
import { api } from "../../lib/api";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (formData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        thumbnail: formData.thumbnail ?? undefined,
     startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      };
      const created = await api("/api/content/campaigns/", {
        method: "POST",
        body: payload,
      });
      navigate(`/brand/campaigns/${created.accessKey}`);
    } catch (error) {
      console.error("Create campaign failed", error);
      alert(error.message || "Unable to create campaign. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link
        to="/brand/campaigns"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Campaigns
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-white">Create Campaign</h1>
        <p className="mt-2 text-zinc-400">Set up a new campaign for clippers to join.</p>
      </div>

      <CampaignForm mode="create" onSubmit={handleCreate} />
    </div>
  );
}