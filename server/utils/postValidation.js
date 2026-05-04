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

function normalizeEventDate(value) {
  if (value == null || value === '') return { error: null, eventDate: null };
  if (typeof value !== 'string') {
    return { error: 'eventDate must be a valid date in YYYY-MM-DD format.' };
  }

  const trimmed = value.trim();
  if (!trimmed) return { error: null, eventDate: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { error: 'eventDate must be a valid date in YYYY-MM-DD format.' };
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { error: 'eventDate must be a valid date in YYYY-MM-DD format.' };
  }

  const isoDate = parsed.toISOString().slice(0, 10);
  if (isoDate !== trimmed) {
    return { error: 'eventDate must be a valid date in YYYY-MM-DD format.' };
  }

  return { error: null, eventDate: trimmed };
}

function validateCreatePostPayload({ title, description, content, imageUrl, eventDate }) {
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

  const eventDateValidation = normalizeEventDate(eventDate);
  if (eventDateValidation.error) {
    return { error: eventDateValidation.error };
  }

  return {
    error: null,
    normalizedTitle,
    normalizedDescription,
    normalizedImageUrl:
      typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
    normalizedEventDate: eventDateValidation.eventDate,
  };
}

module.exports = {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  isValidImageUrl,
  normalizeEventDate,
  validateCreatePostPayload,
};

