import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { fetchPostById } from "../api/posts";
import { updatePost } from "../api/config";
import { newClientUuid, normalizePost, toggleComments } from "../lib/postUtils";
import { supabase } from "../supabaseClient";

function mergePersistedPost(previousPost, persistedPost) {
  const normalized = normalizePost(persistedPost);

  return {
    ...normalized,
    organization_name:
      normalized.organization_name ?? previousPost?.organization_name ?? null,
    showComments: previousPost?.showComments ?? false,
  };
}

function PostDetailsPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      try {
        setIsLoading(true);
        const [{ data }, foundPost] = await Promise.all([
          supabase.auth.getSession(),
          fetchPostById(postId),
        ]);
        if (!isMounted) return;
        setSession(data.session ?? null);
        setPost(foundPost);
        setError(foundPost ? "" : "Post not found.");
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load post.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPost();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleLike = async (id) => {
    const userId = session?.user?.id;
    if (!userId) {
      setActionError("Please sign in to like posts.");
      return;
    }

    const previousPost = post;
    const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
    const userHasLiked = likedBy.includes(userId);
    const currentLikes =
      typeof post.likes === "number" && Number.isFinite(post.likes) && post.likes >= 0
        ? post.likes
        : likedBy.length;
    const nextLikedBy = userHasLiked
      ? likedBy.filter((entry) => entry !== userId)
      : [...likedBy, userId];
    const nextLikes = userHasLiked
      ? Math.max(currentLikes - 1, 0)
      : currentLikes + 1;

    setActionError("");
    setPost({ ...post, liked_by: nextLikedBy, likes: nextLikes });

    try {
      const saved = await updatePost(id, { like_user_id: userId });
      if (saved && typeof saved === "object") {
        setPost((currentPost) =>
          currentPost ? mergePersistedPost(currentPost, saved) : currentPost
        );
      }
    } catch (likeError) {
      setPost(previousPost);
      setActionError(likeError.message || "Unable to update likes right now.");
    }
  };

  const handleToggleComments = (id) => {
    setPost((currentPost) =>
      currentPost ? toggleComments([currentPost], id)[0] : currentPost
    );
  };

  const handleAddComment = async (id, commentText) => {
    const trimmedComment = commentText.trim();
    if (!trimmedComment) return;

    const user = session?.user;
    if (!user?.id) {
      setActionError("Please sign in to comment on posts.");
      return;
    }

    const previousPost = post;
    const authorName =
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name.trim()) ||
      (typeof user.user_metadata?.username === "string" &&
        user.user_metadata.username.trim()) ||
      (typeof user.email === "string" && user.email.trim()) ||
      "Anonymous";
    const optimisticComment = {
      id: newClientUuid(),
      text: trimmedComment,
      user_id: user.id,
      author_name: authorName,
    };
    const updatedPost = {
      ...post,
      comments: [...(Array.isArray(post.comments) ? post.comments : []), optimisticComment],
    };

    setActionError("");
    setPost(updatedPost);

    try {
      const saved = await updatePost(id, { comments: updatedPost.comments });
      if (saved && typeof saved === "object") {
        setPost((currentPost) =>
          currentPost ? mergePersistedPost(currentPost, saved) : currentPost
        );
      }
    } catch (commentError) {
      setPost(previousPost);
      setActionError(commentError.message || "Unable to add the comment right now.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <header className="rounded-md border border-slate-200 bg-white/80 p-4 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Post Details</h1>
        </header>

        {isLoading ? (
          <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-slate-600">
            Loading post...
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <>
            {actionError && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}
            <PostCard
              post={post}
              onLike={handleLike}
              onToggleComments={handleToggleComments}
              onAddComment={handleAddComment}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default PostDetailsPage;
