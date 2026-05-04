import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PostCard from "../src/components/PostCard";

function buildPost(overrides = {}) {
  return {
    id: "post-1",
    club_name: "Campus Robotics",
    avatarUrl: null,
    content: "Weekly lab meeting",
    likes: 2,
    comments: [],
    createdAt: "2026-04-21T12:00:00.000Z",
    showComments: false,
    ...overrides,
  };
}

describe("PostCard", () => {
  it("does not render a clickable author action when userId is missing", () => {
    render(
      <PostCard
        post={buildPost({ userId: undefined })}
        onLike={() => {}}
        onToggleComments={() => {}}
        onAddComment={() => {}}
        onOpenProfile={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Campus Robotics" })).toBeNull();
    expect(screen.getByText("Campus Robotics")).toBeTruthy();
  });

  it("invokes the profile callback when a userId is present", () => {
    const onOpenProfile = vi.fn();

    render(
      <PostCard
        post={buildPost({ userId: "org-profile-1" })}
        onLike={() => {}}
        onToggleComments={() => {}}
        onAddComment={() => {}}
        onOpenProfile={onOpenProfile}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Campus Robotics" }));
    expect(onOpenProfile).toHaveBeenCalledWith("org-profile-1");
  });

  it("renders commenter identity above comment text", () => {
    render(
      <PostCard
        post={buildPost({
          showComments: true,
          comments: [
            { id: "comment-1", author_name: "Health SLU", text: "See you there!" },
          ],
        })}
        onLike={() => {}}
        onToggleComments={() => {}}
        onAddComment={() => {}}
      />
    );

    expect(screen.getByText("Health SLU")).toBeTruthy();
    expect(screen.getByText("See you there!")).toBeTruthy();
  });
});
