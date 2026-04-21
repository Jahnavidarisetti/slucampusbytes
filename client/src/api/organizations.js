import { supabase } from "../supabaseClient";
import { normalizePost } from "../lib/postUtils";

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

export async function fetchOrganizations() {
  const { data, error } = await supabase
    .from("organizations")
    .select(ORGANIZATION_FIELDS);

  if (error) {
    throw new Error(error.message);
  }

  return sortOrganizations(data ?? []);
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
    .select("id, user_id, content, created_at, likes, comments")
    .eq("user_id", organization.profile_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const organizationName = organization?.name || organization?.username || "Organization";

  return (data ?? []).map((post) =>
    normalizePost({
      ...post,
      author: organizationName,
      avatarUrl: organization?.logo_url ?? null,
      role: "Organization",
      organizationId: organization.id,
      organizationDescription: organization?.description ?? null,
    })
  );
}
