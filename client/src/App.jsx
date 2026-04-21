import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import AvatarBadge from "./components/AvatarBadge";
import PostCard from "./components/PostCard";
import OrgSearchBar from "./components/OrgSearchBar";
import { fetchPosts, createPost, updatePost } from "./api/config";
import { syncProfileFromMetadata } from "./lib/supabaseAuth";
import {
  appendComment,
  incrementLike,
  normalizePost,
  toggleComments,
} from "./lib/postUtils";

function App() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  async function loadProfile(userId, metadata = {}) {
    setIsProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, role, avatar_url, full_name, organization_description")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      let syncedProfile = data;

      try {
        syncedProfile = await syncProfileFromMetadata(userId, data, metadata);
      } catch (syncError) {
        console.warn("Unable to sync profile from metadata:", syncError.message);
      }

      const roleFromMetadata = metadata.role?.toString() || "";
      const usernameFromMetadata = metadata.username?.toString() || "";
      const profile = {
        ...syncedProfile,
        role:
          syncedProfile.role && syncedProfile.role.toLowerCase() !== "user"
            ? syncedProfile.role
            : roleFromMetadata || syncedProfile.role,
        username:
          syncedProfile.username ||
          usernameFromMetadata ||
          syncedProfile.full_name ||
          syncedProfile.email,
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
          postsPayload.map((post) => normalizePost(post))
        );
      } catch (err) {
        console.warn("Unable to load posts from API:", err.message);
      }
    };

    loadPosts();
  }, []);

  const handleCreatePost = async (event) => {
    event.preventDefault();
    const content = newPostText.trim();

    if (!content) return;
    if (!session?.user?.id) {
      setApiError("Please sign in to create a post.");
      return;
    }

    setLoadingCreate(true);
    setApiError(null);

    try {
      const response = await createPost({
        content,
        user_id: session.user.id,
      });
      const savedPost = response?.post ?? response;

      if (savedPost) {
        setPosts((prevPosts) => [
          normalizePost(savedPost),
          ...prevPosts,
        ]);
        setNewPostText("");
      }
    } catch (err) {
      setApiError(err.message);
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
    const previousPosts = posts;
    const updatedPosts = appendComment(posts, postId, commentText);

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

  const handleOpenOrganization = (orgId) => {
    navigate(`/organizations/${orgId}`);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 flex justify-center overflow-hidden">
      
      <div className="max-w-[1400px] w-full h-screen bg-gradient-to-b from-slate-50 to-slate-100 shadow-[0_10px_40px_rgba(15,23,42,0.15)] border border-white/70 flex flex-col">
        
        {/* ── Navigation Bar ── */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white/60 backdrop-blur gap-4">
          
          {/* Left: Logo + title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img
              src="/logo.png"
              alt="logo"
              className="h-8 w-8 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                CampusConnect
              </h1>
              <p className="text-xs text-slate-500">Campus posts and org updates</p>
            </div>
          </div>

          {/* Center: Organization search bar */}
          <div className="flex-1 flex justify-center px-4">
            <OrgSearchBar />
          </div>

          {/* Right: Profile + Logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {profile && (
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
                <AvatarBadge
                  src={profile.avatar_url}
                  label={profile.username || profile.email || "Profile"}
                  size="sm"
                />
                <div className="hidden sm:block text-sm">
                  <div className="font-semibold text-slate-800">
                    {profile.username || profile.email}
                  </div>
                  <div className="text-slate-500 text-xs">{profile.role}</div>
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

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-12 gap-4 p-6 flex-1 overflow-hidden min-h-0">
          
          {/* Left sidebar */}
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 h-full overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Menu
              </h2>
              <div className="space-y-3">
                <div className="p-2 rounded bg-slate-100 cursor-pointer hover:bg-blue-50 transition">🏠 Home</div>
                <div className="p-2 rounded bg-slate-100 cursor-pointer hover:bg-blue-50 transition">🎉 Events</div>
                <div className="p-2 rounded bg-slate-100 cursor-pointer hover:bg-blue-50 transition">👥 Clubs</div>
                <div className="p-2 rounded bg-slate-100 cursor-pointer hover:bg-blue-50 transition">📅 Calendar</div>
                <div className="p-2 rounded bg-slate-100 cursor-pointer hover:bg-blue-50 transition">👤 Profile</div>
                <div className="p-2 rounded bg-slate-100 cursor-pointer hover:bg-blue-50 transition">⚙️ Settings</div>
              </div>
            </div>
          </aside>

          {/* Main feed */}
          <main className="col-span-12 lg:col-span-8 flex flex-col min-h-0">
            <div className="rounded-md bg-white/70 border border-slate-200 flex flex-col h-full overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {posts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
                    No posts yet. Organization updates will appear here.
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={handleLike}
                      onToggleComments={handleToggleComments}
                      onAddComment={handleAddComment}
                      onOpenProfile={
                        post.role === "Organization"
                          ? handleOpenOrganization
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </main>

          {/* Right sidebar */}
          <aside className="col-span-12 lg:col-span-2 flex flex-col gap-4">
            {profile?.role === "Organization" && (
              <div className="rounded-md bg-white/70 border border-slate-200 p-4 overflow-hidden">
                <h2 className="text-sm font-semibold mb-4 text-slate-700">
                  Create Post
                </h2>
                {isProfileLoading ? (
                  <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                    Loading profile...
                  </div>
                ) : (
                  <form onSubmit={handleCreatePost} className="space-y-3">
                    <textarea
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder="Share something..."
                      className="w-full min-h-[110px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                    />
                    <button
                      type="submit"
                      disabled={loadingCreate}
                      className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {loadingCreate ? "Posting…" : "Post"}
                    </button>
                  </form>
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
