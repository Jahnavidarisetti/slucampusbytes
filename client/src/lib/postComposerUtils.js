export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const DESCRIPTION_TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "exciting", label: "Exciting" },
  { value: "concise", label: "Concise" },
];

export function isSchemaCompatibilityError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    (message.includes("column") && message.includes("does not exist")) ||
    message.includes("could not find a relationship") ||
    message.includes("schema cache") ||
    message.includes("is not an embedded resource in this request")
  );
}

export function isNetworkFetchError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network error")
  );
}

export function validateComposerInput({ title, description }) {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  const normalizedDescription =
    typeof description === "string" ? description.trim() : "";

  if (!normalizedTitle || !normalizedDescription) {
    return "Please provide a title and description before posting.";
  }

  if (normalizedTitle.length > TITLE_MAX_LENGTH) {
    return `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedDescription.length > DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export function isValidImageFile(file) {
  if (!file) {
    return { ok: false, error: "Please choose an image file." };
  }

  if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: "Unsupported image format. Accepted: JPG, PNG, WEBP, GIF.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      error: "Image is too large. Please upload one under 2MB.",
    };
  }

  return { ok: true, error: null };
}
