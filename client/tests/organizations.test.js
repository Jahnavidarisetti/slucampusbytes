import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchFollowerCount,
  fetchIsFollowing,
  fetchOrganizationById,
  fetchOrganizations,
} from "../src/api/organizations";
import { supabase } from "../src/supabaseClient";

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function buildProfilesSelect(response, recorder = () => {}) {
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
  it("returns only profiles with the Organization role", async () => {
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("profiles");
      return buildProfilesSelect({
        data: [
          {
            id: "org-2",
            username: "robotics",
            full_name: "Robotics Club",
            email: "robotics@slu.edu",
            role: "Organization",
          },
          {
            id: "student-1",
            username: "alex",
            full_name: "Alex Student",
            email: "alex@slu.edu",
            role: "Student",
          },
          {
            id: "org-1",
            username: "acm",
            full_name: "ACM",
            email: "acm@slu.edu",
            role: "Organization",
          },
        ],
        error: null,
      });
    });

    const results = await fetchOrganizations();

    expect(results.map((item) => item.id)).toEqual(["org-1", "org-2"]);
  });

  it("loads an organization by id and rejects non-organization profiles", async () => {
    supabase.from.mockImplementation(() =>
      buildProfilesSelect({
        data: {
          id: "student-1",
          username: "alex",
          full_name: "Alex Student",
          email: "alex@slu.edu",
          role: "Student",
        },
        error: null,
      })
    );

    await expect(fetchOrganizationById("student-1")).rejects.toThrow(
      /Organization not found/i
    );
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
