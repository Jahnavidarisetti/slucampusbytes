import { supabase } from "../supabaseClient";

const SLU_DOMAIN = "slu.edu";

export const normalizeEmail = (email) => email.trim().toLowerCase();

export const isSluEmail = (email) =>
  normalizeEmail(email).endsWith(`@${SLU_DOMAIN}`);

export const validatePassword = (password) =>
  typeof password === "string" && password.length >= 8;

export const validateUsername = (username) =>
  /^[a-zA-Z0-9_]{3,20}$/.test(username);

export const resolveEmailFromIdentifier = async (identifier) => {
  const value = identifier.trim();

  if (!value) {
    throw new Error("Enter a username or SLU email address.");
  }

  if (value.includes("@")) {
    const email = normalizeEmail(value);

    if (!isSluEmail(email)) {
      throw new Error("Only @slu.edu email addresses are allowed.");
    }

    return email;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("username", value)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to look up that username. Try again.");
  }

  if (!data?.email) {
    throw new Error("No account found for that username.");
  }

  if (!isSluEmail(data.email)) {
    throw new Error("Only @slu.edu email addresses are allowed.");
  }

  return data.email;
};

export const checkUsernameAvailable = async (username) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to validate that username right now. ${error.message}`
    );
  }

  return !data;
};

export const uploadAvatarFile = async (file, userId) => {
  const extension = file.name.split(".").pop();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const filePath = `${userId}/${safeName}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (error) {
    throw new Error(`Avatar upload failed. ${error.message}`);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return data.publicUrl;
};

export const updateProfile = async (userId, payload) => {
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (error) {
    throw new Error("Profile update failed. Please try again after login.");
  }
};

function trimMetadataValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildProfileSyncPayload(profile = {}, metadata = {}) {
  const payload = {};
  const username = trimMetadataValue(metadata.username);
  const fullName = trimMetadataValue(metadata.full_name);
  const role = trimMetadataValue(metadata.role);
  const description = trimMetadataValue(metadata.organization_description);
  const avatarUrl = trimMetadataValue(metadata.avatar_url);

  if (username && !profile.username) {
    payload.username = username;
  }

  if (fullName && !profile.full_name) {
    payload.full_name = fullName;
  }

  if (role && (!profile.role || profile.role.toLowerCase() === "user")) {
    payload.role = role;
  }

  if (description && !profile.organization_description) {
    payload.organization_description = description;
  }

  if (avatarUrl && !profile.avatar_url) {
    payload.avatar_url = avatarUrl;
  }

  return payload;
}

export const syncProfileFromMetadata = async (userId, profile = {}, metadata = {}) => {
  const payload = buildProfileSyncPayload(profile, metadata);

  if (Object.keys(payload).length === 0) {
    return profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("id, username, email, role, avatar_url, full_name, organization_description")
    .maybeSingle();

  if (error) {
    throw new Error("Profile sync failed. Please try signing in again.");
  }

  return data ?? { ...profile, ...payload };
};
