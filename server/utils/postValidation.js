const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 5000;

function isValidImageUrl(value) {
  if (value == null) return true;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return true;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function validateCreatePostPayload({ title, description, content, imageUrl }) {
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedDescription =
    typeof description === 'string' && description.trim()
      ? description.trim()
      : typeof content === 'string'
        ? content.trim()
        : '';

  if (!normalizedDescription) {
    return { error: 'Post description/content is required.' };
  }

  if (normalizedTitle.length > TITLE_MAX_LENGTH) {
    return { error: `Title must be ${TITLE_MAX_LENGTH} characters or fewer.` };
  }

  if (normalizedDescription.length > DESCRIPTION_MAX_LENGTH) {
    return { error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.` };
  }

  if (!isValidImageUrl(imageUrl)) {
    return { error: 'image_url must be a valid HTTP(S) URL.' };
  }

  return {
    error: null,
    normalizedTitle,
    normalizedDescription,
    normalizedImageUrl:
      typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
  };
}

module.exports = {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  isValidImageUrl,
  validateCreatePostPayload,
};

