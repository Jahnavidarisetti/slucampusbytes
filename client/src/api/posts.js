import { fetchPosts } from "./config";
import { supabase } from "../supabaseClient";
import { isSchemaCompatibilityError } from "../lib/postComposerUtils";
import { normalizePost } from "../lib/postUtils";

async function fetchPostsDirectFromSupabase() {
  const selectAttempts = [
    "id, user_id, content, title, description, image_url, event_date, created_at, likes, liked_by, comments, profiles(full_name, username, email, avatar_url, role)",
    "id, user_id, content, title, description, image_url, event_date, created_at, likes, liked_by, comments, profiles(username, email, avatar_url, role)",
    "id, user_id, content, title, description, image_url, event_date, created_at, likes, liked_by, comments",
    "id, user_id, content, title, description, image_url, event_date, created_at, likes",
    "id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(full_name, username, email, avatar_url, role)",
    "id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments",
    "id, user_id, content, created_at, likes, liked_by, comments",
    "id, user_id, content, created_at, likes",
    "id, user_id, content, created_at",
  ];

  let lastError = null;

  for (const selection of selectAttempts) {
    const orderColumn = selection.includes("created_at") ? "created_at" : "id";
    const { data, error } = await supabase
      .from("posts")
      .select(selection)
      .order(orderColumn, { ascending: false })
      .limit(100);

    if (!error) {
      return data ?? [];
    }

    if (isSchemaCompatibilityError(error)) {
      lastError = error;
      continue;
    }

    throw error;
  }

  throw lastError || new Error("Unable to load posts.");
}

export async function fetchAllPosts() {
  let posts;

  try {
    const payload = await fetchPosts();
    posts = Array.isArray(payload) ? payload : payload.posts ?? [];
  } catch (error) {
    console.warn("Posts API unavailable, falling back to Supabase:", error.message);
    posts = await fetchPostsDirectFromSupabase();
  }

  return posts.map(normalizePost);
}

export async function fetchEventPosts() {
  const posts = await fetchAllPosts();
  return posts.filter((post) => Boolean(post.eventDate));
}

export async function fetchPostById(postId) {
  const posts = await fetchAllPosts();
  return posts.find((post) => String(post.id) === String(postId)) ?? null;
}
