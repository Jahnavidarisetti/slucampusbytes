import { supabase } from "../supabaseClient";
import { normalizePost } from "../lib/postUtils";
import { apiRequest } from "./config";

const ORGANIZATION_FIELDS = [
  "id",
  "profile_id",
  "username",
  "name",
  "description",
  "logo_url",
  "created_at",
].join(", ");

function sortOrganizations(organizations) {
  return [...organizations].sort((left, right) => {
    const leftName = (left.name || left.username || "").toLowerCase();
    const rightName = (right.name || right.username || "").toLowerCase();
    return leftName.localeCompare(rightName);
  });
}

function countComments(comments) {
  return Array.isArray(comments) ? comments.length : 0;
}

function countLikes(likes) {
  const value = Number(likes ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function buildOrganizationSummaries({ organizations, followers, posts, userId }) {
  return sortOrganizations(
    organizations.map((organization) => {
      const organizationFollowers = followers.filter(
        (follower) => follower.organization_id === organization.id
      );
      const organizationPosts = posts.filter(
        (post) => post.user_id === organization.profile_id
      );

      return {
        ...organization,
        followers_count: organizationFollowers.length,
        posts_count: organizationPosts.length,
        likes_count: organizationPosts.reduce(
          (total, post) => total + countLikes(post.likes),
          0
        ),
        comments_count: organizationPosts.reduce(
          (total, post) => total + countComments(post.comments),
          0
        ),
        is_following: Boolean(
          userId &&
            organizationFollowers.some((follower) => follower.user_id === userId)
        ),
      };
    })
  );
}

async function fetchOrganizationSummariesFromSupabase(userId) {
  const [organizationsResult, followersResult, postsResult] = await Promise.all([
    supabase.from("organizations").select(ORGANIZATION_FIELDS),
    supabase.from("organization_followers").select("user_id, organization_id"),
    supabase.from("posts").select("id, user_id, likes, comments"),
  ]);

  const firstError =
    organizationsResult.error || followersResult.error || postsResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return buildOrganizationSummaries({
    organizations: organizationsResult.data ?? [],
    followers: followersResult.data ?? [],
    posts: postsResult.data ?? [],
    userId,
  });
}

export async function fetchOrganizations() {
  const { data, error } = await supabase
    .from("organizations")
    .select(ORGANIZATION_FIELDS);

  if (error) {
    throw new Error(error.message);
  }

  return sortOrganizations(data ?? []);
}

export async function fetchOrganizationSummaries(userId) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  try {
    const payload = await apiRequest(`/api/organizations${query}`);
    return Array.isArray(payload) ? payload : payload.organizations ?? [];
  } catch (error) {
    if (error instanceof TypeError || /failed to fetch/i.test(error.message)) {
      return fetchOrganizationSummariesFromSupabase(userId);
    }

    throw error;
  }
}

export async function fetchOrganizationById(orgId) {
  const { data, error } = await supabase
    .from("organizations")
    .select(ORGANIZATION_FIELDS)
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Organization not found.");
  }

  return data;
}

export async function fetchOrganizationByProfileId(profileId) {
  const { data, error } = await supabase
    .from("organizations")
    .select(ORGANIZATION_FIELDS)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Organization not found.");
  }

  return data;
}

export async function fetchFollowerCount(orgId) {
  const { count, error } = await supabase
    .from("organization_followers")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function fetchIsFollowing(userId, orgId) {
  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("organization_followers")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function followOrganization(userId, orgId) {
  const { error } = await supabase
    .from("organization_followers")
    .insert({ user_id: userId, organization_id: orgId });

  if (error) {
    throw new Error(error.message);
  }
}

export async function unfollowOrganization(userId, orgId) {
  const { error } = await supabase
    .from("organization_followers")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", orgId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchOrganizationPosts(organization) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, user_id, title, description, image_url, content, event_date, created_at, likes, liked_by, comments"
    )
    .eq("user_id", organization.profile_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const organizationName = organization?.name || organization?.username || "Organization";

  return (data ?? []).map((post) =>
    normalizePost({
      ...post,
      title: post.title ?? "",
      content: post.description ?? post.content ?? "",
      image: post.image_url ?? null,
      organization_name: organizationName,
      author: organizationName,
      avatarUrl: organization?.logo_url ?? null,
      role: "Organization",
      organizationId: organization.id,
      organizationDescription: organization?.description ?? null,
    })
  );
}
