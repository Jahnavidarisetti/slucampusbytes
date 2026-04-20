import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import PostCard from "./components/PostCard";
import { fetchPosts, createPost, updatePost } from "./api/config";

function newClientUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
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
      const profile = {
        ...data,
        role:
          data.role && data.role.toLowerCase() !== "user"
            ? data.role
            : roleFromMetadata || data.role,
        username: data.username || usernameFromMetadata || data.email,
      };
      setProfile(profile);
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

        setPosts(
          postsPayload.map((post) => ({
            id: post.id,
            club_name: "CampusConnect",
            title: post.title,
            content: post.content,
            image: post.image_url,
            likes: Number(post.likes ?? 0),
            comments: Array.isArray(post.comments) ? post.comments : [],
            showComments: false,
          }))
        );
      } catch (err) {
        console.warn("Unable to load posts from API:", err.message);
      }
    };

    loadPosts();
  }, []);


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
                <div className="p-2 rounded bg-slate-100">🏠 Home</div>
                <div className="p-2 rounded bg-slate-100">🎉 Events</div>
                <div className="p-2 rounded bg-slate-100">👥 Clubs</div>
                <div className="p-2 rounded bg-slate-100">📅 Calendar</div>
                <div className="p-2 rounded bg-slate-100">👤 Profile</div>
                <div className="p-2 rounded bg-slate-100">⚙️ Settings</div>
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
                <h2 className="text-sm font-semibold mb-4 text-slate-700">
                  Actions
                </h2>
                {isProfileLoading ? (
                  <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                    Loading profile...
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/create-post")}
                    className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-bold text-white hover:bg-blue-600 transition shadow-md shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create Post
                  </button>
                )}
                {apiError && (
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
                <div className="p-2 rounded bg-slate-100">Hackathon 🔥</div>
                <div className="p-2 rounded bg-slate-100">Dance Night 💃</div>
                <div className="p-2 rounded bg-slate-100">Tech Talk 🎤</div>
                <div className="p-2 rounded bg-slate-100">Photo Walk 📸</div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default App;
