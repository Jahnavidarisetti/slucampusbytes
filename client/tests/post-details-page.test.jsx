import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PostDetailsPage from "../src/pages/PostDetailsPage";
import { updatePost } from "../src/api/config";
import { fetchPostById } from "../src/api/posts";
import { supabase } from "../src/supabaseClient";

vi.mock("../src/api/posts", () => ({
  fetchPostById: vi.fn(),
}));

vi.mock("../src/api/config", () => ({
  updatePost: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

function buildPost(overrides = {}) {
  return {
    id: "post-1",
    userId: "org-1",
    organization_name: "Campus Robotics",
    avatarUrl: null,
    title: "Open Lab",
    content: "Stop by for demos.",
    likes: 3,
    liked_by: [],
    comments: [],
    createdAt: "2026-04-21T12:00:00.000Z",
    showComments: false,
    ...overrides,
  };
}

function renderDetails() {
  return render(
    <MemoryRouter initialEntries={["/posts/post-1"]}>
      <Routes>
        <Route path="/posts/:postId" element={<PostDetailsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchPostById.mockReset();
  updatePost.mockReset();
  supabase.auth.getSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: "student-1",
          email: "student@example.edu",
          user_metadata: { full_name: "Student One" },
        },
      },
    },
  });
});

describe("PostDetailsPage", () => {
  it("persists likes from the details page controls", async () => {
    const post = buildPost();
    fetchPostById.mockResolvedValue(post);
    updatePost.mockResolvedValue({
      ...post,
      likes: 4,
      liked_by: ["student-1"],
    });

    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Like (3)" }));

    expect(screen.getByRole("button", { name: "Like (4)" })).toBeInTheDocument();
    await waitFor(() =>
      expect(updatePost).toHaveBeenCalledWith("post-1", {
        like_user_id: "student-1",
      })
    );
  });

  it("persists comments from the details page controls", async () => {
    const post = buildPost({ showComments: true });
    fetchPostById.mockResolvedValue(post);
    updatePost.mockImplementation((_postId, updates) =>
      Promise.resolve({
        ...post,
        comments: updates.comments,
      })
    );

    renderDetails();

    fireEvent.change(await screen.findByPlaceholderText("Write a comment..."), {
      target: { value: "Looking forward to it" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Looking forward to it")).toBeInTheDocument();
    await waitFor(() =>
      expect(updatePost).toHaveBeenCalledWith(
        "post-1",
        expect.objectContaining({
          comments: [
            expect.objectContaining({
              text: "Looking forward to it",
              user_id: "student-1",
              author_name: "Student One",
            }),
          ],
        })
      )
    );
  });
});
