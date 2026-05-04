import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationsPage from "../src/pages/OrganizationsPage";
import {
  fetchOrganizationSummaries,
  followOrganization,
  unfollowOrganization,
} from "../src/api/organizations";
import { supabase } from "../src/supabaseClient";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../src/api/organizations", () => ({
  fetchOrganizationSummaries: vi.fn(),
  followOrganization: vi.fn(),
  unfollowOrganization: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

beforeEach(() => {
  navigate.mockReset();
  fetchOrganizationSummaries.mockReset();
  followOrganization.mockReset();
  unfollowOrganization.mockReset();
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "student-1" } } },
  });
});

describe("OrganizationsPage", () => {
  it("renders organization cards with activity metrics and follow state", async () => {
    fetchOrganizationSummaries.mockResolvedValue([
      {
        id: "organization-1",
        profile_id: "org-profile-1",
        username: "acm",
        name: "ACM",
        description: "Computer science events",
        logo_url: null,
        followers_count: 12,
        posts_count: 3,
        likes_count: 18,
        comments_count: 5,
        is_following: true,
      },
    ]);

    render(
      <MemoryRouter>
        <OrganizationsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading organizations/i)).toBeInTheDocument();

    expect(await screen.findByText("ACM")).toBeInTheDocument();
    expect(screen.getByText("@acm")).toBeInTheDocument();
    expect(screen.getByText("Computer science events")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getAllByText("Following").length).toBeGreaterThan(0);
  });

  it("follows an organization without opening the details page", async () => {
    fetchOrganizationSummaries.mockResolvedValue([
      {
        id: "organization-2",
        profile_id: "org-profile-2",
        username: "robotics",
        name: "Robotics Club",
        description: "Build nights",
        logo_url: null,
        followers_count: 4,
        posts_count: 1,
        likes_count: 2,
        comments_count: 0,
        is_following: false,
      },
    ]);
    followOrganization.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <OrganizationsPage />
      </MemoryRouter>
    );

    const followButton = await screen.findByRole("button", { name: "Follow" });
    fireEvent.click(followButton);

    await waitFor(() =>
      expect(followOrganization).toHaveBeenCalledWith(
        "student-1",
        "organization-2"
      )
    );
    expect(navigate).not.toHaveBeenCalledWith("/organizations/organization-2");
    expect(await screen.findAllByText("Following")).toHaveLength(1);
  });

  it("unfollows an organization from the following button", async () => {
    fetchOrganizationSummaries.mockResolvedValue([
      {
        id: "organization-4",
        profile_id: "org-profile-4",
        username: "film",
        name: "Film Club",
        description: "Screenings and reviews",
        logo_url: null,
        followers_count: 9,
        posts_count: 2,
        likes_count: 11,
        comments_count: 4,
        is_following: true,
      },
    ]);
    unfollowOrganization.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <OrganizationsPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Following" }));

    await waitFor(() =>
      expect(unfollowOrganization).toHaveBeenCalledWith(
        "student-1",
        "organization-4"
      )
    );
    expect(navigate).not.toHaveBeenCalledWith("/organizations/organization-4");
    expect(await screen.findByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("sorts organizations by relevance, featured activity, and likes", async () => {
    fetchOrganizationSummaries.mockResolvedValue([
      {
        id: "organization-relevant",
        profile_id: "org-profile-relevant",
        username: "honors",
        name: "Honors Board",
        description: "Student leadership",
        logo_url: null,
        followers_count: 4,
        posts_count: 1,
        likes_count: 3,
        comments_count: 1,
        is_following: true,
      },
      {
        id: "organization-featured",
        profile_id: "org-profile-featured",
        username: "service",
        name: "Service Coalition",
        description: "Volunteer events",
        logo_url: null,
        followers_count: 40,
        posts_count: 8,
        likes_count: 12,
        comments_count: 9,
        is_following: false,
      },
      {
        id: "organization-liked",
        profile_id: "org-profile-liked",
        username: "music",
        name: "Music Guild",
        description: "Concert nights",
        logo_url: null,
        followers_count: 5,
        posts_count: 2,
        likes_count: 80,
        comments_count: 2,
        is_following: false,
      },
    ]);

    render(
      <MemoryRouter>
        <OrganizationsPage />
      </MemoryRouter>
    );

    await screen.findByText("Honors Board");
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent(
      "Honors Board"
    );

    fireEvent.click(screen.getByRole("button", { name: "Most Featured" }));
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent(
      "Service Coalition"
    );

    fireEvent.click(screen.getByRole("button", { name: "Most Liked" }));
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent(
      "Music Guild"
    );
  });

  it("opens organization detail when a card is clicked", async () => {
    fetchOrganizationSummaries.mockResolvedValue([
      {
        id: "organization-3",
        profile_id: "org-profile-3",
        username: "dance",
        name: "Dance Society",
        description: "Movement workshops",
        logo_url: null,
        followers_count: 7,
        posts_count: 2,
        likes_count: 8,
        comments_count: 1,
        is_following: false,
      },
    ]);

    render(
      <MemoryRouter>
        <OrganizationsPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /Dance Society/i }));

    expect(navigate).toHaveBeenCalledWith("/organizations/organization-3", {
      state: { fromOrganizations: true },
    });
  });
});
