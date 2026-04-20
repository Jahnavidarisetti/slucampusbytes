import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import PostCard from "./components/PostCard";
import { fetchPosts, createPost, updatePost } from "./api/config";

const POST_CONTENT_PREFIX = "CB_POST_V1::";

function newClientUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function parsePostContent(content) {
  if (typeof content !== "string") {
    return { title: "", description: "", image: null };
  }

  if (!content.startsWith(POST_CONTENT_PREFIX)) {
    return { title: "", description: content, image: null };
  }

  try {
    const rawPayload = content.slice(POST_CONTENT_PREFIX.length);
    const parsed = JSON.parse(decodeURIComponent(rawPayload));
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      image: typeof parsed.image === "string" ? parsed.image : null,
    };
  } catch (_error) {
    return { title: "", description: content, image: null };
  }
}

function mapPostFromApi(post) {
  const parsedLegacy = parsePostContent(post.content);
  return {
    id: post.id,
    club_name: "CampusConnect",
    title:
      (typeof post.title === "string" && post.title.trim()) ||
      parsedLegacy.title ||
      "",
    content:
      (typeof post.description === "string" && post.description.trim()) ||
      parsedLegacy.description ||
      post.content ||
      "",
    image:
      (typeof post.image_url === "string" && post.image_url.trim()) ||
      parsedLegacy.image ||
      null,
    likes: Number(post.likes ?? 0),
    comments: Array.isArray(post.comments) ? post.comments : [],
    showComments: false,
  };
}

export const incrementLike = (posts, id) => {
  return posts.map((post) =>
    post.id === id ? { ...post, likes: post.likes + 1 } : post
  );
};

export const toggleComments = (posts, id) => {
  return posts.map((post) =>
    post.id === id
      ? { ...post, showComments: !post.showComments }
      : post
  );
};

export const addComment = (posts, postId, commentText) => {
  if (!commentText.trim()) return posts;

  const newComment = {
    id: Date.now(),
    text: commentText,
  };

  return posts.map((post) =>
    post.id === postId
      ? { ...post, comments: [...post.comments, newComment] }
      : post
  );
};

function App() {
  const [posts, setPosts] = useState([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  async function loadProfile(userId, metadata = {}) {
    setIsProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, role, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      const roleFromMetadata = metadata.role?.toString() || "";
      const usernameFromMetadata = metadata.username?.toString() || "";
      const profileValue = {
        ...data,
        role:
          data.role && data.role.toLowerCase() !== "user"
            ? data.role
            : roleFromMetadata || data.role,
        username: data.username || usernameFromMetadata || data.email,
      };
      setProfile(profileValue);
    } else {
      setProfile({
        id: userId,
        username: metadata.username || metadata.email || "User",
        email: metadata.email || "",
        role: metadata.role || "user",
        avatar_url: metadata.avatar_url || null,
      });
    }

    setIsProfileLoading(false);
  }

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session ?? null;
      setSession(nextSession);

      if (nextSession?.user?.id) {
        await loadProfile(nextSession.user.id, nextSession.user.user_metadata ?? {});
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextValue = nextSession ?? null;
      setSession(nextValue);

      if (nextValue?.user?.id) {
        loadProfile(nextValue.user.id, nextValue.user.user_metadata ?? {}).catch(
          (err) => {
            console.warn("Unable to load profile after auth change:", err.message);
            setProfile(null);
          }
        );
      } else {
        setProfile(null);
        setIsProfileLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetchPosts();
        const postsPayload = Array.isArray(response)
          ? response
          : response.posts ?? [];

        setPosts(postsPayload.map(mapPostFromApi));
      } catch (err) {
        console.warn("Unable to load posts from API:", err.message);
      }
    };

    loadPosts();
  }, []);

  useEffect(() => {
    if (!isComposerOpen) return undefined;

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsComposerOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isComposerOpen]);

  const resetComposer = () => {
    setPostTitle("");
    setPostDescription("");
    setPostImagePreview(null);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setApiError(null);

    if (!file) {
      setPostImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setApiError("Please upload a valid image file.");
      return;
    }

    const maxSizeInBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setApiError("Image is too large. Please upload one under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPostImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const createPostDirectToSupabase = async ({
    userId,
    title,
    description,
    imageUrl,
  }) => {
    const isMissingColumnError = (error) => {
      const message = String(error?.message || "").toLowerCase();
      return message.includes("column") && message.includes("does not exist");
    };

    const selectAttempts = [
      "id, content, title, description, image_url, created_at, likes, comments",
      "id, content, title, description, image_url, created_at, likes",
      "id, content, created_at, likes, comments",
      "id, content, created_at, likes",
      "id, content, created_at",
    ];

    const payloads = [
      {
        user_id: userId,
        content: description,
        title,
        description,
        image_url: imageUrl || null,
        likes: 0,
        comments: [],
      },
      {
        user_id: userId,
        content: description,
        title,
        description,
        image_url: imageUrl || null,
        likes: 0,
      },
      {
        user_id: userId,
        content: description,
      },
    ];

    let lastError = null;

    for (const payload of payloads) {
      for (const selection of selectAttempts) {
        const { data, error } = await supabase
          .from("posts")
          .insert([payload])
          .select(selection)
          .single();

        if (!error) {
          return data;
        }

        if (isMissingColumnError(error)) {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error("Unable to create post in Supabase.");
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    const title = postTitle.trim();
    const description = postDescription.trim();

    if (!title || !description) {
      setApiError("Please provide a title and description before posting.");
      return;
    }

    if (!session?.user?.id) {
      setApiError("Please sign in to create a post.");
      return;
    }

    setLoadingCreate(true);
    setApiError(null);

    try {
      const response = await createPost({
        content: description,
        title,
        description,
        image_url: postImagePreview,
        user_id: session.user.id,
      });
      const savedPost = response?.post ?? response;

      if (savedPost) {
        setPosts((prevPosts) => [
          mapPostFromApi({
            ...savedPost,
            title: savedPost.title ?? title,
            description: savedPost.description ?? description,
            image_url: savedPost.image_url ?? postImagePreview,
            content: savedPost.content ?? description,
          }),
          ...prevPosts,
        ]);
        resetComposer();
        setIsComposerOpen(false);
      }
    } catch (err) {
      try {
        const savedPost = await createPostDirectToSupabase({
          userId: session.user.id,
          title,
          description,
          imageUrl: postImagePreview,
        });

        setPosts((prevPosts) => [
          mapPostFromApi({
            ...savedPost,
            title: savedPost.title ?? title,
            description: savedPost.description ?? description,
            image_url: savedPost.image_url ?? postImagePreview,
            content: savedPost.content ?? description,
          }),
          ...prevPosts,
        ]);
        resetComposer();
        setIsComposerOpen(false);
        setApiError(null);
      } catch (fallbackError) {
        setApiError(fallbackError.message || err.message);
      }
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleLike = async (id) => {
    const previousPosts = posts;
    const updatedPosts = posts.map((post) =>
      post.id === id ? { ...post, likes: post.likes + 1 } : post
    );

    setPosts(updatedPosts);

    try {
      const updatedPost = updatedPosts.find((post) => post.id === id);
      if (updatedPost) {
        await updatePost(id, { likes: updatedPost.likes });
      }
    } catch (err) {
      setApiError(err.message);
      setPosts(previousPosts);
    }
  };

  const handleToggleComments = (id) => {
    setPosts((prevPosts) => toggleComments(prevPosts, id));
  };

  const handleAddComment = async (postId, commentText) => {
    if (!commentText.trim()) return;

    const optimisticComment = {
      id: newClientUuid(),
      text: commentText,
    };
    const previousPosts = posts;
    const updatedPosts = posts.map((post) =>
      post.id === postId
        ? { ...post, comments: [...post.comments, optimisticComment] }
        : post
    );

    setPosts(updatedPosts);

    try {
      const updatedPost = updatedPosts.find((post) => post.id === postId);
      if (updatedPost) {
        await updatePost(postId, { comments: updatedPost.comments });
      }
    } catch (err) {
      setApiError(err.message);
      setPosts(previousPosts);
    }
  };

  const openComposer = () => {
    setApiError(null);
    setIsComposerOpen(true);
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setApiError(null);
    resetComposer();
  };

  return (
    <div className="h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 flex justify-center overflow-hidden">
      <div className="max-w-[1400px] w-full h-screen bg-gradient-to-b from-slate-50 to-slate-100 shadow-[0_10px_40px_rgba(15,23,42,0.15)] border border-white/70 flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="logo"
              className="h-8 w-8 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                CampusConnect
              </h1>
              <p className="text-sm text-slate-500">Campus posts and org updates</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
                <img
                  src={profile.avatar_url || "/default-avatar.png"}
                  alt={profile.username || "Profile"}
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />
                <div className="hidden sm:block text-sm">
                  <div className="font-semibold text-slate-800">
                    {profile.username || profile.email}
                  </div>
                  <div className="text-slate-500">{profile.role}</div>
                </div>
              </div>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-6 flex-1 overflow-hidden min-h-0">
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 h-full overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Menu
              </h2>
              <div className="space-y-3">
                <div className="p-2 rounded bg-slate-100">Home</div>
                <div className="p-2 rounded bg-slate-100">Events</div>
                <div className="p-2 rounded bg-slate-100">Clubs</div>
                <div className="p-2 rounded bg-slate-100">Calendar</div>
                <div className="p-2 rounded bg-slate-100">Profile</div>
                <div className="p-2 rounded bg-slate-100">Settings</div>
              </div>
            </div>
          </aside>

          <main className="col-span-12 lg:col-span-8 flex flex-col min-h-0">
            <div className="rounded-md bg-white/70 border border-slate-200 flex flex-col h-full overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onToggleComments={handleToggleComments}
                    onAddComment={handleAddComment}
                  />
                ))}
              </div>
            </div>
          </main>

          <aside className="col-span-12 lg:col-span-2 flex flex-col gap-4">
            {profile?.role === "Organization" && (
              <div className="rounded-md bg-white/70 border border-slate-200 p-4 overflow-hidden">
                {isProfileLoading ? (
                  <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                    Loading profile...
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openComposer}
                    className="group relative w-full overflow-hidden rounded-xl border border-sky-300 bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-300/40 transition hover:-translate-y-0.5"
                  >
                    <span className="absolute inset-0 bg-white/15 opacity-0 transition group-hover:opacity-100" />
                    <span className="relative">Create Post</span>
                  </button>
                )}
                {apiError && !isComposerOpen && (
                  <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {apiError}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md bg-white/70 border border-slate-200 p-4 overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Upcoming
              </h2>
              <div className="space-y-3">
                <div className="p-2 rounded bg-slate-100">Hackathon</div>
                <div className="p-2 rounded bg-slate-100">Dance Night</div>
                <div className="p-2 rounded bg-slate-100">Tech Talk</div>
                <div className="p-2 rounded bg-slate-100">Photo Walk</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {isComposerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-3 py-6 backdrop-blur-sm sm:px-6"
          onClick={closeComposer}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Compose Campus Post</h3>
                <p className="text-sm text-slate-600">
                  Share polished updates with students in one tap.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="relative mt-5 space-y-4">
              <div className="space-y-1">
                <label htmlFor="post-title" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </label>
                <input
                  id="post-title"
                  type="text"
                  value={postTitle}
                  onChange={(event) => setPostTitle(event.target.value)}
                  placeholder="Enter an announcement title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="post-image" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Image Upload
                </label>
                <input
                  id="post-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700 hover:border-sky-300"
                />
                {postImagePreview && (
                  <img
                    src={postImagePreview}
                    alt="Post preview"
                    className="mt-3 h-44 w-full rounded-xl border border-slate-200 object-cover"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="post-description" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </label>
                <textarea
                  id="post-description"
                  value={postDescription}
                  onChange={(event) => setPostDescription(event.target.value)}
                  placeholder="Write the full post details for students..."
                  className="min-h-[150px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              {apiError && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeComposer}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingCreate}
                  className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/50 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingCreate ? "Posting..." : "Send Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
