import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchFollowerCount,
  fetchIsFollowing,
  fetchOrganizationById,
  fetchOrganizationByProfileId,
  fetchOrganizationPosts,
  fetchOrganizationSummaries,
  fetchOrganizations,
} from "../src/api/organizations";
import { supabase } from "../src/supabaseClient";

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function buildOrganizationsSelect(response, recorder = () => {}) {
  return {
    select(selection) {
      recorder(selection);
      const query = {
        eq(column, value) {
          recorder({ column, value });
          return query;
        },
        order(column, options) {
          recorder({ orderBy: column, options });
          return Promise.resolve(response);
        },
        maybeSingle() {
          return Promise.resolve(response);
        },
        then(resolve) {
          return Promise.resolve(response).then(resolve);
        },
      };

      return {
        ...query,
      };
    },
  };
}

function buildFollowersCount(response) {
  return {
    select() {
      return {
        eq() {
          return Promise.resolve(response);
        },
      };
    },
  };
}

function buildFollowerLookup(response) {
  return {
    select() {
      return {
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve(response);
        },
      };
    },
  };
}

function buildSimpleSelect(response) {
  return {
    select() {
      return Promise.resolve(response);
    },
  };
}

beforeEach(() => {
  supabase.from.mockReset();
});

describe("Organization lookup", () => {
  it("returns organizations sorted by name", async () => {
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("organizations");
      return buildOrganizationsSelect({
        data: [
          {
            id: "organization-2",
            profile_id: "profile-2",
            username: "robotics",
            name: "Robotics Club",
            description: "Build bots",
          },
          {
            id: "organization-1",
            profile_id: "profile-1",
            username: "acm",
            name: "ACM",
            description: "CS chapter",
          },
        ],
        error: null,
      });
    });

    const results = await fetchOrganizations();

    expect(results.map((item) => item.id)).toEqual([
      "organization-1",
      "organization-2",
    ]);
  });

  it("returns an empty list when Supabase returns null data", async () => {
    supabase.from.mockImplementation(() =>
      buildOrganizationsSelect({
        data: null,
        error: null,
      })
    );

    const results = await fetchOrganizations();
    expect(results).toEqual([]);
  });

  it("loads an organization by id", async () => {
    supabase.from.mockImplementation(() =>
      buildOrganizationsSelect({
        data: {
          id: "organization-1",
          profile_id: "profile-1",
          username: "acm",
          name: "ACM",
          description: "CS chapter",
        },
        error: null,
      })
    );

    const result = await fetchOrganizationById("organization-1");
    expect(result.profile_id).toBe("profile-1");
  });

  it("throws when an organization id lookup returns null", async () => {
    supabase.from.mockImplementation(() =>
      buildOrganizationsSelect({
        data: null,
        error: null,
      })
    );

    await expect(fetchOrganizationById("missing-org")).rejects.toThrow(
      /Organization not found/i
    );
  });

  it("loads an organization by owner profile id", async () => {
    supabase.from.mockImplementation(() =>
      buildOrganizationsSelect({
        data: {
          id: "organization-2",
          profile_id: "profile-2",
          username: "robotics",
          name: "Robotics Club",
          description: "Build bots",
        },
        error: null,
      })
    );

    const result = await fetchOrganizationByProfileId("profile-2");
    expect(result.id).toBe("organization-2");
  });
});

describe("Organization followers", () => {
  it("returns follower count from the mapping table", async () => {
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("organization_followers");
      return buildFollowersCount({ count: 7, error: null });
    });

    const count = await fetchFollowerCount("org-1");
    expect(count).toBe(7);
  });

  it("reports when the current user already follows an organization", async () => {
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("organization_followers");
      return buildFollowerLookup({
        data: { user_id: "student-1" },
        error: null,
      });
    });

    const follows = await fetchIsFollowing("student-1", "org-1");
    expect(follows).toBe(true);
  });

  it("returns false immediately when there is no signed-in user", async () => {
    const follows = await fetchIsFollowing(null, "org-1");
    expect(follows).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("Organization listing API", () => {
  it("loads organization summaries with the current user id", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url) => ({
      ok: true,
      json: async () => ({
        ok: true,
        organizations: [
          {
            id: "organization-1",
            name: "ACM",
            followers_count: 2,
            posts_count: 1,
            likes_count: 4,
            comments_count: 3,
            is_following: true,
          },
        ],
      }),
      statusText: "OK",
    }));

    try {
      const results = await fetchOrganizationSummaries("student-1");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/organizations?user_id=student-1",
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(results[0]).toMatchObject({
        id: "organization-1",
        followers_count: 2,
        is_following: true,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("falls back to Supabase summaries when the backend is unavailable", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    supabase.from.mockImplementation((table) => {
      if (table === "organizations") {
        return buildSimpleSelect({
          data: [
            {
              id: "organization-1",
              profile_id: "org-profile-1",
              username: "acm",
              name: "ACM",
              description: "CS chapter",
              logo_url: null,
            },
          ],
          error: null,
        });
      }

      if (table === "organization_followers") {
        return buildSimpleSelect({
          data: [
            { user_id: "student-1", organization_id: "organization-1" },
            { user_id: "student-2", organization_id: "organization-1" },
          ],
          error: null,
        });
      }

      if (table === "posts") {
        return buildSimpleSelect({
          data: [
            {
              id: "post-1",
              user_id: "org-profile-1",
              likes: 5,
              comments: [{ text: "Nice" }],
            },
          ],
          error: null,
        });
      }

      throw new Error(`Unexpected table ${table}`);
    });

    try {
      const results = await fetchOrganizationSummaries("student-1");

      expect(results[0]).toMatchObject({
        id: "organization-1",
        followers_count: 2,
        posts_count: 1,
        likes_count: 5,
        comments_count: 1,
        is_following: true,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("Organization posts", () => {
  it("loads event dates for organization detail posts", async () => {
    const selections = [];
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("posts");
      return buildOrganizationsSelect(
        {
          data: [
            {
              id: "post-1",
              user_id: "profile-1",
              title: "Spring Tournament",
              description: "Registration opens this week.",
              image_url: null,
              content: "Registration opens this week.",
              event_date: "2026-05-12",
              created_at: "2026-04-28T09:00:00.000Z",
              likes: 9,
              liked_by: [],
              comments: [],
            },
          ],
          error: null,
        },
        (entry) => selections.push(entry)
      );
    });

    const posts = await fetchOrganizationPosts({
      id: "org-1",
      profile_id: "profile-1",
      name: "Chess Club",
      logo_url: null,
    });

    expect(selections[0]).toContain("event_date");
    expect(posts[0]).toMatchObject({
      id: "post-1",
      eventDate: "2026-05-12",
    });
  });
});
