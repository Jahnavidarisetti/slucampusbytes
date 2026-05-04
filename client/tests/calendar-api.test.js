import { beforeEach, describe, expect, it } from "vitest";
import { fetchCalendarEvents, saveCalendarEvent } from "../src/api/calendar";

describe("calendar api", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists saved calendar events by user and prevents duplicates", async () => {
    await saveCalendarEvent("student-1", {
      postId: "post-1",
      title: "Career Fair",
      eventDate: "2026-05-20",
      image: "https://example.com/career.png",
    });
    await saveCalendarEvent("student-1", {
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
  });
});
