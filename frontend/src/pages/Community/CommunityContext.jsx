import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";

const CommunityContext = createContext(null);

function normalizeName(raw) {
  if (!raw) return "Community member";
  if (typeof raw === "string") return raw.trim() || "Community member";
  if (typeof raw === "object") {
    const first = raw.first_name || raw.firstName || "";
    const last = raw.last_name || raw.lastName || "";
    const username = raw.username || raw.email || raw.user_name || "";
    const full = [first, last].filter(Boolean).join(" ").trim();
    return full || username || "Community member";
  }
  return "Community member";
}

function makeSyntheticUser(author, index) {
  const raw = author || {};
  const username = raw.username || raw.email || raw.user_name || `community_user_${index + 1}`;
  const name = normalizeName(raw);
  const userId = String(raw.id || `community_${index + 1}_${username}`);

  return {
    id: userId,
    name,
    username: username.toString().replace(/^@/, ""),
    avatar: raw.avatar || null,
    bio: raw.bio || raw.tagline || "Community member",
    verified: Boolean(raw.verified || raw.user_type === "creator" || raw.user_type === "brand"),
    followers: 0,
    following: 0,
    joined: "Recently",
    tagline: raw.tagline || raw.bio || "Community contributor",
    cover: raw.cover || null,
    tabs: { created: [], joined: [], reviews: [] },
  };
}

function formatRelativeTime(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function deriveDiscussionTitle(content) {
  const raw = String(content || "").trim();
  if (!raw) return "Community update";
  const firstLine = raw.split("\n")[0].trim();
  return firstLine.length <= 80 ? firstLine : `${firstLine.slice(0, 75).trim()}...`;
}

function normalizeMediaForRequest(mediaItems) {
  if (!Array.isArray(mediaItems)) {
    if (mediaItems && typeof mediaItems === 'object') {
      return normalizeMediaForRequest(Object.values(mediaItems));
    }
    return [];
  }

  return mediaItems
    .flatMap((item) => {
      if (Array.isArray(item)) return normalizeMediaForRequest(item);

      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }

      if (item && typeof item === 'object') {
        const candidates = [
          item.url,
          item.preview,
          item.src,
          item.image,
          item.image_url,
          item.thumbnail,
          item.cover,
          item.video,
          item.video_url,
          item.media_url,
          item.gif,
          item.poster,
        ];
        const direct = candidates
          .filter((value) => typeof value === 'string' && value.trim())
          .map((value) => value.trim())
          .filter((value) => value.startsWith('http://') || value.startsWith('https://'));

        if (direct.length > 0) return direct;

        if (Object.keys(item).length > 0) {
          return normalizeMediaForRequest(Object.values(item));
        }
      }

      return [];
    })
    .filter((item, index, list) => item && list.indexOf(item) === index);
}

function mapDiscussionToThread(discussion, index, usersByKey) {
  const author = discussion.author || {};
  const userId = String(author.id || `community_${index + 1}_${author.username || author.email || index}`);
  const user = usersByKey[userId] || makeSyntheticUser(author, index);
  usersByKey[user.id] = user;

  const media = normalizeMediaForRequest(discussion.media);

  const title = (discussion.title || "").trim();
  const content = discussion.content || "";
  // `title` is auto-derived from the start of `content` on creation
  // (see deriveDiscussionTitle), so blindly concatenating title + content
  // duplicated short posts (e.g. "hi" -> "hi\n\nhi"). Only show the title
  // separately when it isn't just an echo of where the content already starts.
  const article = title && !content.trim().startsWith(title)
    ? `${title}\n\n${content}`
    : content || title || "";

  return {
    id: String(discussion.id),
    userId: user.id,
    source: discussion.tags ? { label: discussion.tags.split(",")[0]?.trim() || "Community", url: "#" } : null,
    sourceType: discussion.category ? discussion.category.replace(/_/g, " ") : "Public forum",
    timestamp: formatRelativeTime(discussion.created_at),
    article,
    media: media.length > 0 ? media : null,
    poll: discussion.poll && Object.keys(discussion.poll).length > 0 ? discussion.poll : null,
    likes: Number(discussion.likes_count || 0),
    liked: Boolean(discussion.is_liked),
    comments: Number(discussion.replies_count || 0),
    views: Number(discussion.views_count || 0),
    rawCategory: discussion.category,
  };
}

function mapReplyToComment(reply, index, usersByKey) {
  const author = reply.author || {};
  const userId = String(author.id || `community_reply_${index + 1}_${author.username || author.email || index}`);
  const user = usersByKey[userId] || makeSyntheticUser(author, index);
  usersByKey[user.id] = user;

  return {
    id: `reply_${reply.id || index}`,
    userId: user.id,
    text: reply.content || "",
    timestamp: new Date(reply.created_at || Date.now()).getTime(),
  };
}

export function CommunityProvider({ children }) {
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [threads, setThreads] = useState([]);
  const [votedPolls, setVotedPolls] = useState({});
  const [commentsByThread, setCommentsByThread] = useState({});
  const [activeCommentThreadId, setActiveCommentThreadId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCommunityData() {
      try {
        setLoading(true);
        setError(null);

        const discussionsRes = await api("/api/community/discussions/");

        const discussions = Array.isArray(discussionsRes?.results)
          ? discussionsRes.results
          : Array.isArray(discussionsRes)
            ? discussionsRes
            : [];
        const usersByKey = {};
        const mappedThreads = discussions.map((discussion, index) => mapDiscussionToThread(discussion, index, usersByKey));
        const derivedComments = {};

        discussions.forEach((discussion, discussionIndex) => {
          const replies = Array.isArray(discussion.replies) ? discussion.replies : [];
          derivedComments[String(discussion.id)] = replies.map((reply, replyIndex) =>
            mapReplyToComment(reply, discussionIndex * 100 + replyIndex, usersByKey)
          );
        });

        const identity = (currentUser && (currentUser.id || currentUser.email || currentUser.username))
          ? {
              id: String(currentUser.id || currentUser.email || currentUser.username || "u_me"),
              name: currentUser.name || currentUser.email || "You",
              username: currentUser.username || currentUser.email || "you",
              avatar: currentUser.avatar || null,
              bio: "You",
              verified: true,
              followers: 0,
              following: 0,
              joined: "Recently",
              tagline: "Community member",
              cover: null,
              tabs: { created: [], joined: [], reviews: [] },
            }
          : {
              id: "u_me",
              name: "You",
              username: "you",
              avatar: null,
              bio: "You",
              verified: true,
              followers: 0,
              following: 0,
              joined: "Recently",
              tagline: "Community member",
              cover: null,
              tabs: { created: [], joined: [], reviews: [] },
            };

        usersByKey[identity.id] = identity;

        if (isMounted) {
          setUsers(Object.values(usersByKey));
          setThreads(mappedThreads);
          setCommentsByThread(derivedComments);
        }
      } catch (loadError) {
        if (isMounted) {
          setUsers([]);
          setThreads([]);
          setCommentsByThread({});
          setError(loadError?.message || "Unable to load community data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCommunityData();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.username, reloadToken]);

  const identity = useMemo(() => {
    const id = String(currentUser?.id || currentUser?.email || currentUser?.username || "u_me");

    return {
      id,
      name: currentUser?.name || currentUser?.email || "You",
      username: currentUser?.username || currentUser?.email || "you",
      avatar: currentUser?.avatar || null,
      bio: "You",
      verified: true,
      followers: 0,
      following: 0,
      joined: "Recently",
      tagline: "Community member",
      cover: null,
      tabs: { created: [], joined: [], reviews: [] },
    };
  }, [currentUser]);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach((u) => (map[u.id] = u));
    map[identity.id] = map[identity.id] || identity;
    map.u_me = map.u_me || {
      id: "u_me",
      name: "You",
      username: "you",
      avatar: null,
      bio: "You",
      verified: true,
      followers: 0,
      following: 0,
      joined: "Recently",
      tagline: "Community member",
      cover: null,
      tabs: { created: [], joined: [], reviews: [] },
    };
    return map;
  }, [users, identity]);

  const toggleLike = async (threadId) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, liked: !t.liked, likes: Math.max(0, t.liked ? t.likes - 1 : t.likes + 1) }
          : t
      )
    );

    try {
      const response = await api(`/api/community/discussions/${threadId}/like/`, {
        method: "POST",
      });

      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, liked: Boolean(response.liked), likes: Number(response.likes_count || t.likes) }
            : t
        )
      );
    } catch (err) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, liked: !t.liked, likes: Math.max(0, t.liked ? t.likes - 1 : t.likes + 1) }
            : t
        )
      );
      setError(err?.message || "Unable to update like.");
      console.error(err);
    }
  };

  const addThread = async (newThread) => {
    const content = String(newThread?.article || "").trim();
    const mediaItems = Array.isArray(newThread?.media) ? newThread.media : [];
    const normalizedMedia = normalizeMediaForRequest(mediaItems);
    const hasUpload = mediaItems.some((item) => item && typeof item === 'object' && item.file instanceof File);
    const hasPoll = newThread?.poll && typeof newThread.poll.question === 'string' && String(newThread.poll.question).trim().length > 0;
    if (!content && !normalizedMedia.length && !hasUpload && !hasPoll) return;

    const tempId = `local_${Date.now()}`;
    const previewMedia = normalizedMedia;

    const pendingThread = {
      id: tempId,
      userId: identity.id,
      source: null,
      timestamp: "now",
      likes: 0,
      liked: false,
      comments: 0,
      views: 0,
      article: content,
      media: previewMedia.length > 0 ? previewMedia : null,
      poll: hasPoll ? newThread.poll : null,
    };

    setThreads((prev) => [pendingThread, ...prev]);
    setUsers((prev) => (prev.some((u) => u.id === identity.id) ? prev : [identity, ...prev]));

    try {
      const payloadData = {
        title: deriveDiscussionTitle(content),
        content,
        category: "general",
        tags: "",
      };

      const formData = hasUpload ? new FormData() : null;

      if (hasPoll) {
        if (formData) {
          formData.append('poll', JSON.stringify(newThread.poll));
        } else {
          payloadData.poll = newThread.poll;
        }
      }

      if (normalizedMedia.length > 0) {
        if (formData) {
          normalizedMedia.forEach((url) => formData.append('media', url));
        } else {
          payloadData.media = normalizedMedia;
        }
      }

      if (hasUpload) {
        mediaItems
          .filter((item) => item && typeof item === 'object' && item.file instanceof File)
          .forEach((item) => formData.append('media_files', item.file));

        formData.append('title', payloadData.title);
        formData.append('content', payloadData.content);
        formData.append('category', payloadData.category);
        formData.append('tags', payloadData.tags);
      }

      const created = await api("/api/community/discussions/", {
        method: "POST",
        body: formData || payloadData,
      });

      const usersByKey = { ...usersById };
      const savedThread = mapDiscussionToThread(created, 0, usersByKey);

      // The create response often omits `author` — since we know this
      // post is ours, always attribute it to the current identity rather
      // than trusting whatever mapDiscussionToThread guessed.
      savedThread.userId = identity.id;
      usersByKey[identity.id] = identity;

      setUsers(Object.values(usersByKey));
      setThreads((prev) => prev.map((t) => (t.id === tempId ? savedThread : t)));
      setCommentsByThread((prev) => ({ ...prev, [String(created.id)]: [] }));
    } catch (createError) {
      setThreads((prev) => prev.filter((t) => t.id !== tempId));
      setError(createError?.message || "Unable to create post.");
      console.error(createError);
    }
  };

  const votePoll = (threadId, optionId) => {
    setVotedPolls((prev) => {
      if (prev[threadId] === optionId) return prev;
      return { ...prev, [threadId]: optionId };
    });

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId || !t.poll) return t;
        const alreadyVoted = votedPolls[threadId];
        const options = t.poll.options.map((opt) => {
          if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
          if (opt.id === alreadyVoted) return { ...opt, votes: Math.max(0, opt.votes - 1) };
          return opt;
        });
        return { ...t, poll: { ...t.poll, options } };
      })
    );
  };

  const getComments = (threadId) => commentsByThread[threadId] || [];

  const addComment = async (threadId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const comment = {
      id: tempId,
      userId: identity.id,
      text: trimmed,
      timestamp: Date.now(),
    };

    setCommentsByThread((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), comment],
    }));

    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, comments: t.comments + 1 } : t))
    );

    setUsers((prev) => (prev.some((u) => u.id === identity.id) ? prev : [identity, ...prev]));

    try {
      const reply = await api(`/api/community/discussions/${threadId}/reply/`, {
        method: "POST",
        body: { content: trimmed },
      });

      const usersByKey = { ...usersById };
      const mappedReply = mapReplyToComment(reply, Date.now(), usersByKey);

      // Same fix as addThread — the reply response often lacks a real
      // author, so attribute it to the current identity instead.
      mappedReply.userId = identity.id;
      usersByKey[identity.id] = identity;

      setUsers(Object.values(usersByKey));
      setCommentsByThread((prev) => ({
        ...prev,
        [threadId]: (prev[threadId] || []).map((c) =>
          c.id === tempId ? mappedReply : c
        ),
      }));
    } catch (replyError) {
      setCommentsByThread((prev) => ({
        ...prev,
        [threadId]: (prev[threadId] || []).filter((c) => c.id !== tempId),
      }));
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, comments: Math.max(0, t.comments - 1) } : t
        )
      );
      setError(replyError?.message || "Unable to submit comment.");
      console.error(replyError);
    }
  };

  const openComments = (threadId) => setActiveCommentThreadId(threadId);
  const closeComments = () => setActiveCommentThreadId(null);
  const reload = () => setReloadToken((value) => value + 1);

  const value = {
    users,
    usersById,
    threads,
    loading,
    error,
    reload,
    toggleLike,
    votedPolls,
    votePoll,
    addThread,
    getComments,
    addComment,
    activeCommentThreadId,
    openComments,
    closeComments,
  };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used inside CommunityProvider");
  return ctx;
}
