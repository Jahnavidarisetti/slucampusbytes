import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchFollowerCount,
  fetchIsFollowing,
  fetchOrganizationById,
  fetchOrganizationByProfileId,
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
});
