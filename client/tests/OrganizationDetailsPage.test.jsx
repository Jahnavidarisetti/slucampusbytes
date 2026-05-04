import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import OrganizationDetailsPage from "../src/pages/OrganizationDetailsPage";

const mockFetchFollowerCount = vi.fn();
const mockFetchIsFollowing = vi.fn();
const mockFetchOrganizationById = vi.fn();
const mockFetchOrganizationPosts = vi.fn();
const mockFollowOrganization = vi.fn();
const mockUnfollowOrganization = vi.fn();
const mockUpdatePost = vi.fn();
const mockGetSession = vi.fn();

vi.mock("../src/components/PostCard", () => ({
  default: ({ post }) => (
    <article data-testid="post-card">
      <h3>{post.title || "Untitled post"}</h3>
      <p>{post.content}</p>
    </article>
  ),
}));

vi.mock("../src/api/organizations", () => ({
  fetchFollowerCount: (...args) => mockFetchFollowerCount(...args),
  fetchIsFollowing: (...args) => mockFetchIsFollowing(...args),
  fetchOrganizationById: (...args) => mockFetchOrganizationById(...args),
  fetchOrganizationPosts: (...args) => mockFetchOrganizationPosts(...args),
  followOrganization: (...args) => mockFollowOrganization(...args),
  unfollowOrganization: (...args) => mockUnfollowOrganization(...args),
}));

vi.mock("../src/api/config", () => ({
  updatePost: (...args) => mockUpdatePost(...args),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
    },
  },
}));

function renderPage(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/organizations/:orgId"
          element={<OrganizationDetailsPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("OrganizationDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "viewer-1",
            email: "viewer@slu.edu",
            user_metadata: {
              full_name: "Viewer User",
            },
          },
        },
      },
    });
    mockFetchOrganizationById.mockResolvedValue({
      id: "org-1",
      profile_id: "profile-1",
      name: "Chess Club",
      username: "chess-club",
      description: "Strategy and weekly matches.",
      created_at: "2026-01-10T12:00:00.000Z",
    });
    mockFetchFollowerCount.mockResolvedValue(12);
    mockFetchIsFollowing.mockResolvedValue(false);
    mockFetchOrganizationPosts.mockResolvedValue([
      {
        id: "post-1",
        title: "Spring Tournament",
        content: "Registration opens this week.",
        likes: 9,
        comments: [{ id: "comment-1", text: "Nice" }],
        createdAt: "2026-04-28T09:00:00.000Z",
      },
    ]);
    mockUpdatePost.mockResolvedValue({});
  });

  it("shows skeleton loading state before organization data resolves", () => {
    mockFetchOrganizationById.mockImplementation(
      () => new Promise(() => {})
    );

    renderPage("/organizations/org-1");

    expect(
      screen.getByTestId("organization-details-skeleton")
    ).toBeInTheDocument();
  });

  it("renders organization details, stats, posts, and back link from list context", async () => {
    renderPage({
      pathname: "/organizations/org-1",
      state: { fromOrganizations: true },
    });

    await waitFor(() =>
      expect(screen.getByText("Chess Club")).toBeInTheDocument()
    );

    expect(screen.getByText("Strategy and weekly matches.")).toBeInTheDocument();
    expect(screen.getByText("Back to Organizations")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Spring Tournament")).toBeInTheDocument();
    expect(screen.getByText("Registration opens this week.")).toBeInTheDocument();
    expect(
      screen.getAllByText(/(Jan 10, 2026|10 Jan 2026)/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/(Apr 28, 2026|28 Apr 2026)/).length
    ).toBeGreaterThan(0);
  });
});
