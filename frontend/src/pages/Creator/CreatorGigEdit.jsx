import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CampaignForm from "../campaignform";

const MOCK_EXISTING_GIG = {
  name: "Podcast Clips Campaign",
  category: "Podcast",
  thumbnail: null,
  description:
    "Create engaging clips from podcast episodes and help maximize reach across social platforms.",
  clipperRequirements:
    "Clips must be under 60s, include captions, and credit the original episode.",
  budget: "10000",
  rewardPer1k: "20",
  maxEarnings: "5000",
  platforms: ["YouTube", "Instagram"],
  resources: [
    {
      id: 1,
      name: "Episode raw footage",
      url: "https://drive.google.com/example",
    },
  ],
  startDate: "2026-06-01",
  endDate: "",
};

export default function EditGig() {
  const { id } = useParams();
  const navigate = useNavigate();

  // TODO: Replace with GET /gigs/:id
  const existingGig = MOCK_EXISTING_GIG;

  const handleUpdate = async (formData) => {
    // TODO: PATCH /gigs/:id
    console.log("Updating Gig", id, formData);

    navigate(`/creator/gigs/${id}`);
  };

  return (
    <div className="space-y-8">
      <Link
        to={`/creator/gigs/${id}`}
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Gig
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-white">
          Edit Gig
        </h1>

        <p className="mt-2 text-zinc-400">
          Update your gig's details.
        </p>
      </div>

      <CampaignForm
        mode="edit"
        initialData={existingGig}
        onSubmit={handleUpdate}
      />
    </div>
  );
}