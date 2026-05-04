import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { fetchPostById } from "../api/posts";

function PostDetailsPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      try {
        setIsLoading(true);
        const foundPost = await fetchPostById(postId);
        if (!isMounted) return;
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
          <PostCard
            post={post}
            onLike={() => {}}
            onToggleComments={() => {}}
            onAddComment={() => {}}
          />
        )}
      </div>
    </div>
  );
}

export default PostDetailsPage;
