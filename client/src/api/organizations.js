import { supabase } from "../supabaseClient";
import { normalizePost } from "../lib/postUtils";

const ORGANIZATION_PROFILE_FIELDS = [
  "id",
  "username",
  "full_name",
  "email",
  "avatar_url",
  "organization_description",
  "role",
].join(", ");

function isOrganizationProfile(profile) {
  const normalizedRole = String(profile?.role || "").trim().toLowerCase();
  return normalizedRole === "organization";
}

function sortOrganizations(organizations) {
  return [...organizations].sort((left, right) => {
    const leftName = (left.username || left.full_name || left.email || "").toLowerCase();
    const rightName = (right.username || right.full_name || right.email || "").toLowerCase();
    return leftName.localeCompare(rightName);
  });
}

export async function fetchOrganizations() {
  const { data, error } = await supabase
    .from("profiles")
    .select(ORGANIZATION_PROFILE_FIELDS)
    .eq("role", "Organization");

  if (error) {
    throw new Error(error.message);
  }

  return sortOrganizations((data ?? []).filter(isOrganizationProfile));
}

export async function fetchOrganizationById(orgId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(ORGANIZATION_PROFILE_FIELDS)
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !isOrganizationProfile(data)) {
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

export async function fetchOrganizationPosts(orgId, organization) {
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, content, created_at, likes, comments")
    .eq("user_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const organizationName =
    organization?.username || organization?.full_name || "Organization";

  return (data ?? []).map((post) =>
    normalizePost({
      ...post,
      author: organizationName,
      avatarUrl: organization?.avatar_url ?? null,
      role: organization?.role ?? "Organization",
      organizationDescription: organization?.organization_description ?? null,
    })
  );
}
