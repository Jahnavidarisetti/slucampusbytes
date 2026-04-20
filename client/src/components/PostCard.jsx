function PostCard({ post, onLike, onToggleComments, onAddComment }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
          {post.club_name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{post.club_name}</h3>
          <p className="text-xs text-slate-500">Campus Event</p>
        </div>
      </div>

      {post.title && (
        <h4 className="mb-2 text-lg font-bold tracking-tight text-slate-900">
          {post.title}
        </h4>
      )}

      <p className="mb-3 whitespace-pre-wrap text-slate-700">{post.content}</p>

      {post.image && (
        <img
          src={post.image}
          alt="post"
          className="mb-3 max-h-[520px] w-full rounded-xl border border-slate-100 bg-slate-50 object-contain"
        />
      )}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-blue-100 hover:text-blue-600"
        >
          <span>Like ({post.likes})</span>
        </button>

        <button
          onClick={() => onToggleComments(post.id)}
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-blue-100 hover:text-blue-600"
        >
          <span>Comment ({post.comments.length})</span>
        </button>
      </div>

      {post.showComments && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-4 space-y-3">
            {post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
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
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
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
