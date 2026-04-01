import { useEffect, useState } from "react";
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
  const [posts, setPosts] = useState([
    {
      id: "00000000-0000-4000-8000-000000000001",
      club_name: "Tech Club",
      content: "Join us for Hackathon this weekend! ðŸš€",
      image:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80",
      likes: 5,
      comments: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          text: "This looks exciting!",
        },
        {
          id: "10000000-0000-4000-8000-000000000002",
          text: "Iâ€™m joining for sure.",
        },
      ],
      showComments: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      club_name: "Dance Club",
      content: "Auditions open now ðŸ’ƒ Donâ€™t miss it!",
      image:
        "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1000&q=80",
      likes: 8,
      comments: [
        {
          id: "10000000-0000-4000-8000-000000000003",
          text: "Can beginners join?",
        },
      ],
      showComments: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      club_name: "Photography Club",
      content:
        "Photo walk this Sunday ðŸ“¸ Meet at the student center.",
      image:
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80",
      likes: 3,
      comments: [],
      showComments: false,
    },
  ]);
  const [newPostText, setNewPostText] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetchPosts();

        if (response?.ok && Array.isArray(response.posts)) {
          setPosts(
            response.posts.map((post) => ({
              id: post.id,
              club_name: "CampusConnect",
              content: post.content,
              image: null,
              likes: Number(post.likes ?? 0),
              comments: Array.isArray(post.comments) ? post.comments : [],
              showComments: false,
            }))
          );
        }
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

    setLoadingCreate(true);
    setApiError(null);

    try {
      const response = await createPost({ content });
      const savedPost = response?.post;

      if (savedPost) {
        setPosts((prevPosts) => [
          {
            id: savedPost.id,
            club_name: "CampusConnect",
            content: savedPost.content,
            image: null,
            likes: Number(savedPost.likes ?? 0),
            comments: Array.isArray(savedPost.comments) ? savedPost.comments : [],
            showComments: false,
          },
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
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === id ? { ...post, likes: post.likes + 1 } : post
      )
    );

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
        
        <div className="h-16 flex items-center px-6 border-b border-slate-200 bg-white/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="logo"
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-lg font-bold text-slate-800">
              CampusConnect
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-6 flex-1 overflow-hidden min-h-0">
          
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 h-full overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Menu
              </h2>
              <div className="space-y-3">
                <div className="p-2 rounded bg-slate-100">ðŸ  Home</div>
                <div className="p-2 rounded bg-slate-100">ðŸŽ‰ Events</div>
                <div className="p-2 rounded bg-slate-100">ðŸ‘¥ Clubs</div>
                <div className="p-2 rounded bg-slate-100">ðŸ“… Calendar</div>
                <div className="p-2 rounded bg-slate-100">âš™ï¸ Settings</div>
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
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Create Post
              </h2>
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
                  {loadingCreate ? 'Posting...' : 'Post'}
                </button>
              </form>
              {apiError && (
                <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiError}
                </div>
              )}
            </div>

            <div className="rounded-md bg-white/70 border border-slate-200 p-4 overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Upcoming
              </h2>
              <div className="space-y-3">
                <div className="p-2 rounded bg-slate-100">Hackathon ðŸ”¥</div>
                <div className="p-2 rounded bg-slate-100">Dance Night ðŸ’ƒ</div>
                <div className="p-2 rounded bg-slate-100">Tech Talk ðŸŽ¤</div>
                <div className="p-2 rounded bg-slate-100">Photo Walk ðŸ“¸</div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default App;
