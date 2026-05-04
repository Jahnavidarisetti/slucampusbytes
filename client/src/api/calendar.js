const CALENDAR_STORAGE_PREFIX = "campusbytes:calendar:";

function storageKey(userId) {
  return `${CALENDAR_STORAGE_PREFIX}${userId || "guest"}`;
}

function readEvents(userId) {
  if (typeof localStorage === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(userId, events) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(events));
}

export async function fetchCalendarEvents(userId) {
  return readEvents(userId).sort((a, b) =>
    String(a.eventDate || "").localeCompare(String(b.eventDate || ""))
  );
}

export async function saveCalendarEvent(userId, event) {
  const normalized = {
    postId: event.postId ?? event.id,
    title: event.title || "Untitled event",
    eventDate: event.eventDate,
    image: event.image || null,
  };

  if (!normalized.postId || !normalized.eventDate) {
    throw new Error("Calendar event requires a post and event date.");
  }

  const events = readEvents(userId);
  const existingIndex = events.findIndex(
    (entry) => String(entry.postId) === String(normalized.postId)
  );

  if (existingIndex >= 0) {
    events[existingIndex] = { ...events[existingIndex], ...normalized };
  } else {
    events.push(normalized);
  }

  writeEvents(userId, events);
  return {
    event: normalized,
    alreadyAdded: existingIndex >= 0,
  };
}

export async function removeCalendarEvent(userId, postId) {
  if (!postId) {
    throw new Error("Calendar event requires a post.");
  }

  const events = readEvents(userId);
  const nextEvents = events.filter(
    (entry) => String(entry.postId) !== String(postId)
  );

  writeEvents(userId, nextEvents);
  return {
    removed: nextEvents.length !== events.length,
  };
}
