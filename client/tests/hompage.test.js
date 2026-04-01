import { describe, it, expect } from "vitest";
import { incrementLike, toggleComments, addComment } from "../src/App";

describe("Interactive Feed Tests", () => {

  const mockPosts = [
    {
      id: 1,
      likes: 5,
      comments: [],
      showComments: false,
    },
  ];

  // Test 1: Like button
  it("test_like_increments_count", () => {
    const result = incrementLike(mockPosts, 1);
    expect(result[0].likes).toBe(6);
  });

  // Test 2: Toggle comments
  it("test_toggle_comments_visibility", () => {
    const result = toggleComments(mockPosts, 1);
    expect(result[0].showComments).toBe(true);
  });

  // Test 3: Add comment
  it("test_add_comment_success", () => {
    const result = addComment(mockPosts, 1, "Hello");
    expect(result[0].comments.length).toBe(1);
  });

  // Test 4: Empty comment
  it("test_empty_comment_not_added", () => {
    const result = addComment(mockPosts, 1, "");
    expect(result[0].comments.length).toBe(0);
  });

});