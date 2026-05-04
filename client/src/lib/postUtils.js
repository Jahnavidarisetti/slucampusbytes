export function newClientUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizePost(post) {
  return {
    id: post.id,
    userId: post.userId ?? post.user_id ?? null,
    organizationId: post.organizationId ?? post.organization_id ?? null,
    club_name: post.club_name ?? post.author ?? "CampusConnect",
    organization_name: post.organization_name ?? null,
    avatarUrl: post.avatarUrl ?? post.avatar_url ?? null,
    role: post.role ?? null,
    description: post.description ?? post.organizationDescription ?? null,
    title: post.title ?? "",
    content: post.content ?? post.description ?? "",
    image: post.image ?? post.image_url ?? null,
    likes: Number(post.likes ?? 0),
    liked_by: Array.isArray(post.liked_by) ? post.liked_by : [],
    comments: Array.isArray(post.comments)
      ? post.comments.map((comment) => ({
          id: comment?.id ?? newClientUuid(),
          text: typeof comment?.text === "string" ? comment.text : "",
          user_id: typeof comment?.user_id === "string" ? comment.user_id : null,
          author_name:
            (typeof comment?.author_name === "string" &&
              comment.author_name.trim()) ||
            (typeof comment?.author === "string" && comment.author.trim()) ||
            "Anonymous",
        }))
      : [],
    createdAt: post.createdAt ?? post.created_at ?? null,
    showComments: Boolean(post.showComments),
  };
}

export function toggleComments(posts, id) {
  return posts.map((post) =>
    post.id === id ? { ...post, showComments: !post.showComments } : post
  );
}

export function incrementLike(posts, id) {
  return posts.map((post) =>
    post.id === id ? { ...post, likes: post.likes + 1 } : post
  );
}

export function appendComment(posts, postId, commentText) {
  if (!commentText.trim()) {
    return posts;
  }

  const optimisticComment = {
    id: newClientUuid(),
    text: commentText.trim(),
  };

  return posts.map((post) =>
    post.id === postId
      ? { ...post, comments: [...post.comments, optimisticComment] }
      : post
  );
}
