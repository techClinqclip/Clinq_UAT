import { useRef, useState } from "react";
import { Image as ImageIcon, Smile, BarChart3, X, Plus } from "lucide-react";
import Avatar from "./Avatar";
import { useCommunity } from "../CommunityContext";

const EMOJIS = ["😀", "🔥", "🎉", "😂", "👏", "💯", "🚀", "❤️", "😮", "🙌", "😅", "🤔"];

const MOCK_GIFS = [
  "https://media.tenor.com/2roX3P0PbdQAAAAC/nice-thumbs-up.gif",
  "https://media.tenor.com/OB0TjHIcQFsAAAAC/clapping-applause.gif",
  "https://media.tenor.com/gT3YFrjeShgAAAAC/excited-yes.gif",
  "https://media.tenor.com/Vc6bLJ2FvvUAAAAC/mind-blown.gif",
];

export default function PostComposer() {
  const { addThread, usersById } = useCommunity();
  const currentUser = usersById["u_me"];
  const [article, setArticle] = useState("");
  const [media, setMedia] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const fileInputRef = useRef(null);

  const resetComposer = () => {
    setArticle("");
    setMedia([]);
    setPollOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowEmoji(false);
    setShowGif(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setMedia((prev) => [...prev, { file, preview }]);
    e.target.value = "";
  };

  const handleAddEmoji = (emoji) => {
    setArticle((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleAddGif = (gifUrl) => {
    setMedia((prev) => [...prev, gifUrl]);
    setShowGif(false);
  };

  const updatePollOption = (idx, value) => {
    setPollOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const addPollOption = () => {
    if (pollOptions.length >= 5) return;
    setPollOptions((prev) => [...prev, ""]);
  };

  const removePollOption = (idx) => {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const validPollOptions = pollOptions.map((opt) => opt.trim()).filter(Boolean);
  const hasPoll = pollOpen && pollQuestion.trim().length > 0 && validPollOptions.length >= 2;
  const canPost = article.trim().length > 0 || media.length > 0 || hasPoll;

  const handlePost = () => {
    if (!canPost) return;

    const pollPayload = hasPoll
      ? {
          question: pollQuestion.trim(),
          options: validPollOptions.map((label, idx) => ({
            id: `option_${idx + 1}`,
            label,
            votes: 0,
          })),
        }
      : null;

    addThread({
      article: article.trim(),
      media: media.length > 0 ? media : undefined,
      poll: pollPayload,
    });

    resetComposer();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#11111A] p-5">
      <div className="flex gap-3">
        <Avatar src={currentUser.avatar} name={currentUser.name} size={40} />

        <div className="flex-1 space-y-3">
          <textarea
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            placeholder="Share something with the community..."
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />

          {/* Media preview */}
          {media.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {media.map((item, i) => {
                const src = typeof item === 'string' ? item : item.preview;
                return (
                  <div key={i} className="group relative overflow-hidden rounded-xl border border-white/10">
                    <img src={src} alt="" className="h-32 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Poll creation */}
          {pollOpen && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white">Create a poll</p>
                <button
                  type="button"
                  onClick={() => setPollOpen(false)}
                  className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="mb-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
              />

              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(i)}
                        className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-violet-400 transition hover:text-violet-300"
                >
                  <Plus size={13} />
                  Add option
                </button>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-violet-400"
                title="Upload media"
              >
                <ImageIcon size={17} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowGif((v) => !v);
                    setShowEmoji(false);
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-violet-400"
                  title="Add GIF"
                >
                  GIF
                </button>
                {showGif && (
                  <div className="absolute left-0 top-full z-20 mt-2 grid w-64 grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#15151F] p-3 shadow-2xl">
                    {MOCK_GIFS.map((gif) => (
                      <button
                        key={gif}
                        type="button"
                        onClick={() => handleAddGif(gif)}
                        className="overflow-hidden rounded-lg border border-white/10 transition hover:border-violet-500/50"
                      >
                        <img src={gif} alt="" className="h-16 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmoji((v) => !v);
                    setShowGif(false);
                  }}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-violet-400"
                  title="Add emoji"
                >
                  <Smile size={17} />
                </button>
                {showEmoji && (
                  <div className="absolute left-0 top-full z-20 mt-2 grid w-56 grid-cols-6 gap-1 rounded-2xl border border-white/10 bg-[#15151F] p-3 shadow-2xl">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddEmoji(emoji)}
                        className="rounded-lg p-1.5 text-lg transition hover:bg-white/10"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPollOpen((v) => !v)}
                className={`rounded-lg p-2 transition hover:bg-white/5 ${pollOpen ? "text-violet-400" : "text-zinc-400 hover:text-violet-400"}`}
                title="Create poll"
              >
                <BarChart3 size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={handlePost}
              disabled={!canPost}
              className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
