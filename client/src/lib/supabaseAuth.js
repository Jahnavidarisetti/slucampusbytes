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
