import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import AvatarBadge from "../components/AvatarBadge";
import {
  fetchFollowerCount,
  fetchIsFollowing,
  fetchOrganizationById,
  fetchOrganizationPosts,
  followOrganization,
  unfollowOrganization,
} from "../api/organizations";
import { updatePost } from "../api/config";
import {
  newClientUuid,
  toggleComments,
} from "../lib/postUtils";
import { supabase } from "../supabaseClient";

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function OrganizationDetailsPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizationPage() {
      setLoading(true);
      setLoadError("");
      setActionError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id ?? null;
        setSession(session ?? null);

        const org = await fetchOrganizationById(orgId);
        const [followers, following, orgPosts] = await Promise.all([
          fetchFollowerCount(orgId),
          fetchIsFollowing(currentUserId, orgId),
          fetchOrganizationPosts(org),
        ]);

        if (!isMounted) {
          return;
        }

        setSessionUserId(currentUserId);
        setOrganization(org);
        setFollowerCount(followers);
        setIsFollowing(following);
        setPosts(orgPosts);
      } catch (loadError) {
        if (isMounted) {
          setLoadError(loadError.message || "Failed to load organization details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOrganizationPage();

    return () => {
      isMounted = false;
    };
  }, [orgId]);

  const totals = useMemo(
    () =>
      posts.reduce(
        (accumulator, post) => {
          accumulator.likes += Number(post.likes ?? 0);
          accumulator.comments += post.comments.length;
          return accumulator;
        },
        { likes: 0, comments: 0 }
      ),
    [posts]
  );

  const canFollow =
    Boolean(sessionUserId) &&
    Boolean(organization) &&
    sessionUserId !== organization.profile_id;

  const handleToggleFollow = async () => {
    if (!canFollow) {
      return;
    }

    const nextFollowing = !isFollowing;
    setFollowLoading(true);
    setActionError("");
    setIsFollowing(nextFollowing);
    setFollowerCount((current) => Math.max(0, current + (nextFollowing ? 1 : -1)));

    try {
      if (nextFollowing) {
        await followOrganization(sessionUserId, organization.id);
      } else {
        await unfollowOrganization(sessionUserId, organization.id);
      }
    } catch (followError) {
      setIsFollowing(!nextFollowing);
      setFollowerCount((current) =>
        Math.max(0, current + (nextFollowing ? -1 : 1))
      );
      setActionError(followError.message || "Unable to update follow status.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async (postId) => {
    if (!sessionUserId) {
      setActionError("Please sign in to like posts.");
      return;
    }

    const previousPosts = posts;
    const updatedPosts = posts.map((post) => {
      if (post.id !== postId) return post;

      const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
      const userHasLiked = likedBy.includes(sessionUserId);
      const currentLikes =
        typeof post.likes === "number" && Number.isFinite(post.likes) && post.likes >= 0
          ? post.likes
          : likedBy.length;
      const nextLikedBy = userHasLiked
        ? likedBy.filter((entry) => entry !== sessionUserId)
        : [...likedBy, sessionUserId];
      const nextLikes = userHasLiked
        ? Math.max(currentLikes - 1, 0)
        : currentLikes + 1;

      return {
        ...post,
        liked_by: nextLikedBy,
        likes: nextLikes,
      };
    });

    setActionError("");
    setPosts(updatedPosts);

    try {
      const saved = await updatePost(postId, { like_user_id: sessionUserId });
      if (saved && typeof saved === "object") {
        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes: Number(saved.likes ?? post.likes ?? 0),
                  liked_by: Array.isArray(saved.liked_by)
                    ? saved.liked_by
                    : post.liked_by ?? [],
                  comments: Array.isArray(saved.comments)
                    ? saved.comments.map((comment) => ({
                        id: comment?.id ?? newClientUuid(),
                        text: typeof comment?.text === "string" ? comment.text : "",
                        user_id:
                          typeof comment?.user_id === "string"
                            ? comment.user_id
                            : null,
                        author_name:
                          (typeof comment?.author_name === "string" &&
                            comment.author_name.trim()) ||
                          (typeof comment?.author === "string" &&
                            comment.author.trim()) ||
                          "Anonymous",
                      }))
                    : post.comments,
                }
              : post
          )
        );
      }
    } catch (likeError) {
      setPosts(previousPosts);
      setActionError(likeError.message || "Unable to update likes right now.");
    }
  };

  const handleToggleComments = (postId) => {
    setPosts((currentPosts) => toggleComments(currentPosts, postId));
  };

  const handleAddComment = async (postId, commentText) => {
    if (!commentText.trim()) {
      return;
    }
    if (!sessionUserId) {
      setActionError("Please sign in to comment on posts.");
      return;
    }

    const previousPosts = posts;
    const commentAuthorName =
      (session?.user?.user_metadata?.full_name &&
        String(session.user.user_metadata.full_name).trim()) ||
      (session?.user?.user_metadata?.username &&
        String(session.user.user_metadata.username).trim()) ||
      (session?.user?.email && String(session.user.email).trim()) ||
      "Anonymous";
    const optimisticComment = {
      id: newClientUuid(),
      text: commentText.trim(),
      user_id: sessionUserId,
      author_name: commentAuthorName,
    };
    const updatedPosts = posts.map((post) =>
      post.id === postId
        ? { ...post, comments: [...(Array.isArray(post.comments) ? post.comments : []), optimisticComment] }
        : post
    );
    setActionError("");
    setPosts(updatedPosts);

    try {
      const targetPost = updatedPosts.find((post) => post.id === postId);
      if (targetPost) {
        const saved = await updatePost(postId, { comments: targetPost.comments });
        if (saved && typeof saved === "object") {
          setPosts((current) =>
            current.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    likes: Number(saved.likes ?? post.likes ?? 0),
                    liked_by: Array.isArray(saved.liked_by)
                      ? saved.liked_by
                      : post.liked_by ?? [],
                    comments: Array.isArray(saved.comments)
                      ? saved.comments.map((comment) => ({
                          id: comment?.id ?? newClientUuid(),
                          text: typeof comment?.text === "string" ? comment.text : "",
                          user_id:
                            typeof comment?.user_id === "string"
                              ? comment.user_id
                              : null,
                          author_name:
                            (typeof comment?.author_name === "string" &&
                              comment.author_name.trim()) ||
                            (typeof comment?.author === "string" &&
                              comment.author.trim()) ||
                            "Anonymous",
                        }))
                      : post.comments,
                  }
                : post
            )
          );
        }
      }
    } catch (commentError) {
      setPosts(previousPosts);
      setActionError(commentError.message || "Unable to add the comment right now.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>

          {canFollow && (
            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={followLoading}
              className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition ${
                isFollowing
                  ? "bg-slate-700 hover:bg-slate-800"
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {followLoading
                ? "Updating..."
                : isFollowing
                  ? "Following"
                  : "Follow organization"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Loading organization details...
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {loadError}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {actionError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {actionError}
              </div>
            )}
            <section className="rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <AvatarBadge
                  src={organization?.logo_url}
                  label={organization?.name || organization?.username || "Organization"}
                  size="xl"
                />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold text-slate-900">
                      {organization?.name ||
                        organization?.username ||
                        "Organization"}
                    </h1>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                      Organization
                    </span>
                  </div>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                    {organization?.description ||
                      "This organization has not added a description yet."}
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Followers" value={followerCount} />
                    <StatCard label="Posts" value={posts.length} />
                    <StatCard label="Total Likes" value={totals.likes} />
                    <StatCard label="Total Comments" value={totals.comments} />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Organization Posts
                  </h2>
                  <p className="text-sm text-slate-500">
                    Updates published by this organization across CampusConnect.
                  </p>
                </div>
              </div>

              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
                  No posts from this organization yet.
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onToggleComments={handleToggleComments}
                    onAddComment={handleAddComment}
                  />
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
