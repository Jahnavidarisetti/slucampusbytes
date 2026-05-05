import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchEventPosts } from "../src/api/posts";
import { fetchPosts } from "../src/api/config";
import { supabase } from "../src/supabaseClient";

vi.mock("../src/api/config", () => ({
  fetchPosts: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

beforeEach(() => {
  fetchPosts.mockReset();
  supabase.from.mockReset();
});

describe("posts api", () => {
  it("returns only posts with event dates", async () => {
    const embeddedContent = `CB_POST_V1::${encodeURIComponent(
      JSON.stringify({
        title: "Embedded Event",
        description: "Details",
        eventDate: "2026-05-22",
      })
    )}`;
    fetchPosts.mockResolvedValue([
      {
        id: "event-post",
        title: "Event",
        content: "Details",
        eventDate: "2026-05-20",
      },
      {
        id: "embedded-event-post",
        content: embeddedContent,
      },
      {
        id: "regular-post",
        title: "Regular",
        content: "Update",
      },
    ]);

    const events = await fetchEventPosts();

    expect(events).toHaveLength(2);
    expect(events[0].id).toBe("event-post");
    expect(events[0].eventDate).toBe("2026-05-20");
    expect(events[1].id).toBe("embedded-event-post");
    expect(events[1].eventDate).toBe("2026-05-22");
  });

  it("falls back to Supabase when the posts API is unavailable", async () => {
    fetchPosts.mockRejectedValue(new Error("Failed to fetch"));
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "supabase-event",
            title: "Supabase Event",
            content: "Details",
            event_date: "2026-05-21",
          },
        ],
        error: null,
      }),
    });

    const events = await fetchEventPosts();

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("supabase-event");
    expect(events[0].eventDate).toBe("2026-05-21");
  });
});
