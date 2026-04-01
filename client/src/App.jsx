import { useState } from "react";
import PostCard from "./components/PostCard";

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
      content: "Join us for Hackathon this weekend! 🚀",
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
          text: "I’m joining for sure.",
        },
      ],
      showComments: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      club_name: "Dance Club",
      content: "Auditions open now 💃 Don’t miss it!",
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
        "Photo walk this Sunday 📸 Meet at the student center.",
      image:
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80",
      likes: 3,
      comments: [],
      showComments: false,
    },
  ]);

  const handleLike = async (id) => {
    setPosts((prevPosts) => incrementLike(prevPosts, id));

    try {
      
    } catch {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === id ? { ...post, likes: post.likes - 1 } : post
        )
      );
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

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, optimisticComment] }
          : post
      )
    );

    try {
    } catch {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.filter(
                  (c) => c.id !== optimisticComment.id
                ),
              }
            : post
        )
      );
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 flex justify-center overflow-hidden">
      
      <div className="max-w-[1400px] w-full h-screen bg-gradient-to-b from-slate-50 to-slate-100 shadow-[0_10px_40px_rgba(15,23,42,0.15)] border border-white/70 flex flex-col">
        
        { }
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

        { }
        <div className="grid grid-cols-12 gap-4 p-6 flex-1 overflow-hidden min-h-0">
          
          { }
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
                <div className="p-2 rounded bg-slate-100">⚙️ Settings</div>
              </div>
            </div>
          </aside>

          { }
          <main className="col-span-12 lg:col-span-8 flex flex-col min-h-0">
            <div className="rounded-md bg-white/70 border border-slate-200 flex flex-col h-full overflow-hidden min-h-0">
              
              { }
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

          { }
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 h-full overflow-hidden">
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

        { }
        <div className="border-t border-slate-200 bg-slate-100/80 px-6 py-3 flex items-center gap-3 h-16">
          <div className="h-8 w-8 rounded-full bg-slate-300" />
          <input
            type="text"
            placeholder="Share something..."
            className="h-8 w-48 px-3 rounded bg-white border border-slate-300 text-sm outline-none"
          />
          <div className="ml-auto flex gap-2">
            <button className="h-8 px-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
              Post
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
