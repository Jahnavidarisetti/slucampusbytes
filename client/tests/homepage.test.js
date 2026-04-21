import { describe, expect, it, vi } from "vitest";
import {
  appendComment,
  incrementLike,
  normalizePost,
  toggleComments,
} from "../src/lib/postUtils";

describe("Post utility helpers", () => {
  const mockPosts = [
    {
      id: 1,
      userId: "org-1",
      club_name: "Campus Robotics",
      likes: 5,
      comments: [],
      showComments: false,
    },
  ];

  it("increments likes for the targeted post", () => {
    const result = incrementLike(mockPosts, 1);
    expect(result[0].likes).toBe(6);
  });

  it("toggles comment visibility", () => {
    const result = toggleComments(mockPosts, 1);
    expect(result[0].showComments).toBe(true);
  });

  it("appends a new optimistic comment", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "comment-1",
    });

    const result = appendComment(mockPosts, 1, "Hello");
    expect(result[0].comments).toEqual([{ id: "comment-1", text: "Hello" }]);
  });

  it("ignores empty comments", () => {
    const result = appendComment(mockPosts, 1, "");
    expect(result[0].comments.length).toBe(0);
  });

  it("normalizes feed payloads into the shared client shape", () => {
    const post = normalizePost({
      id: "post-1",
      userId: "org-1",
      author: "Campus Robotics",
      avatarUrl: "https://cdn.example.com/org.png",
      role: "Organization",
      content: "Build night at 7 PM",
      likes: "3",
      comments: [{ id: "comment-2", text: "I am in" }],
      createdAt: "2026-04-21T12:00:00.000Z",
    });

    expect(post).toMatchObject({
      id: "post-1",
      userId: "org-1",
      club_name: "Campus Robotics",
      avatarUrl: "https://cdn.example.com/org.png",
      role: "Organization",
      likes: 3,
      createdAt: "2026-04-21T12:00:00.000Z",
    });
  });
});
