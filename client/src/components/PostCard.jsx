function PostCard({ post, onLike, onToggleComments, onAddComment }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center text-sm font-semibold text-slate-700">
          {post.club_name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{post.club_name}</h3>
          <p className="text-xs text-slate-500">Campus Event</p>
        </div>
      </div>

      {post.title && (
        <h2 className="text-lg font-bold text-slate-900 mb-2">{post.title}</h2>
      )}

      <p className="text-slate-700 mb-3 whitespace-pre-wrap">{post.content}</p>

      {post.image && (
        <div className="rounded-xl overflow-hidden border border-slate-100 mb-3">
          <img
            src={post.image}
            alt={post.title || "post image"}
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-blue-100 hover:text-blue-600 transition"
        >
          👍 <span>Like ({post.likes})</span>
        </button>

        <button
          onClick={() => onToggleComments(post.id)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-blue-100 hover:text-blue-600 transition"
        >
          💬 <span>Comment ({post.comments.length})</span>
        </button>
      </div>

      {post.showComments && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          
          <div className="space-y-3 mb-4">
            {post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm"
                >
                  {comment.text}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No comments yet.</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              const input = form.comment;
              const value = input.value.trim();

              if (!value) return;

              onAddComment(post.id, value);
              input.value = "";
            }}
            className="flex gap-2"
          >
            <input
              name="comment"
              type="text"
              placeholder="Write a comment..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default PostCard;