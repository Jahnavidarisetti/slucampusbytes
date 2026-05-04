import { beforeEach, describe, expect, it } from "vitest";
import {
  fetchCalendarEvents,
  removeCalendarEvent,
  saveCalendarEvent,
} from "../src/api/calendar";

describe("calendar api", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists saved calendar events by user and prevents duplicates", async () => {
    const firstSave = await saveCalendarEvent("student-1", {
      postId: "post-1",
      title: "Career Fair",
      eventDate: "2026-05-20",
      image: "https://example.com/career.png",
    });
    const secondSave = await saveCalendarEvent("student-1", {
      postId: "post-1",
      title: "Career Fair Updated",
      eventDate: "2026-05-20",
      image: null,
    });

    const events = await fetchCalendarEvents("student-1");

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      postId: "post-1",
      title: "Career Fair Updated",
      eventDate: "2026-05-20",
    });
    expect(firstSave.alreadyAdded).toBe(false);
    expect(secondSave.alreadyAdded).toBe(true);
  });

  it("removes saved calendar events by post id", async () => {
    await saveCalendarEvent("student-1", {
      postId: "post-1",
      title: "Career Fair",
      eventDate: "2026-05-20",
      image: null,
    });

    const result = await removeCalendarEvent("student-1", "post-1");
    const events = await fetchCalendarEvents("student-1");

    expect(result.removed).toBe(true);
    expect(events).toEqual([]);
  });
});
