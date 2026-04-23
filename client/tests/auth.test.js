import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkUsernameAvailable,
  isSluEmail,
  normalizeEmail,
  resolveEmailFromIdentifier,
  syncOrganizationFromProfile,
  syncProfileFromMetadata,
  upsertOrganization,
  validatePassword,
  validateUsername,
} from "../src/lib/supabaseAuth";
import { supabase } from "../src/supabaseClient";

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

function buildProfilesLookup(response) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve(response),
      }),
    }),
  };
}

function buildProfileUpdate(response, recorder) {
  return {
    update(payload) {
      recorder(payload);
      return {
        eq: (_column, _value) => ({
          select: () => ({
            maybeSingle: () => Promise.resolve(response),
          }),
        }),
      };
    },
  };
}

function buildOrganizationUpsert(response, recorder) {
  return {
    upsert(payload) {
      recorder(payload);
      return {
        select: () => ({
          maybeSingle: () => Promise.resolve(response),
        }),
      };
    },
  };
}

beforeEach(() => {
  supabase.from.mockReset();
});

describe("SLU email validation", () => {
  it("normalizes emails to lowercase", () => {
    expect(normalizeEmail("  USER@SLU.EDU ")).toBe("user@slu.edu");
  });

  it("accepts @slu.edu addresses", () => {
    expect(isSluEmail("student@slu.edu")).toBe(true);
  });

  it("rejects non-SLU addresses", () => {
    expect(isSluEmail("student@gmail.com")).toBe(false);
  });
});

describe("Dual-credential login", () => {
  it("resolves an SLU email directly", async () => {
    const result = await resolveEmailFromIdentifier("user@slu.edu");
    expect(result).toBe("user@slu.edu");
  });

  it("rejects non-SLU emails", async () => {
    await expect(resolveEmailFromIdentifier("user@gmail.com")).rejects.toThrow(
      /@slu\.edu/i
    );
  });

  it("resolves a username to an SLU email", async () => {
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("profiles");
      return buildProfilesLookup({
        data: { email: "member@slu.edu" },
        error: null,
      });
    });

    const result = await resolveEmailFromIdentifier("campus_user");
    expect(result).toBe("member@slu.edu");
  });

  it("fails when username lookup returns no match", async () => {
    supabase.from.mockImplementation(() =>
      buildProfilesLookup({ data: null, error: null })
    );

    await expect(resolveEmailFromIdentifier("missing_user")).rejects.toThrow(
      /No account found/i
    );
  });
});

describe("Username + password validation", () => {
  it("validates usernames using allowed characters", () => {
    expect(validateUsername("campus_01")).toBe(true);
    expect(validateUsername("bad space")).toBe(false);
  });

  it("validates minimum password length", () => {
    expect(validatePassword("12345678")).toBe(true);
    expect(validatePassword("short")).toBe(false);
  });

  it("reports username availability from profiles table", async () => {
    supabase.from.mockImplementation(() =>
      buildProfilesLookup({ data: null, error: null })
    );

    const available = await checkUsernameAvailable("unique_user");
    expect(available).toBe(true);
  });

  it("detects when username is taken", async () => {
    supabase.from.mockImplementation(() =>
      buildProfilesLookup({ data: { id: "123" }, error: null })
    );

    const available = await checkUsernameAvailable("taken_user");
    expect(available).toBe(false);
  });
});

describe("Profile sync from auth metadata", () => {
  it("updates default user profiles with organization metadata", async () => {
    let payload = null;

    supabase.from.mockImplementation((table) => {
      expect(table).toBe("profiles");
      return buildProfileUpdate(
        {
          data: {
            id: "org-1",
            username: "slucompsoc",
            email: "org@slu.edu",
            role: "Organization",
            avatar_url: null,
            full_name: "SLU Computer Society",
            organization_description: null,
          },
          error: null,
        },
        (nextPayload) => {
          payload = nextPayload;
        }
      );
    });

    const result = await syncProfileFromMetadata(
      "org-1",
      {
        id: "org-1",
        email: "org@slu.edu",
        role: "user",
        username: null,
        full_name: null,
        avatar_url: null,
      },
      {
        role: "Organization",
        username: "slucompsoc",
        full_name: "SLU Computer Society",
      }
    );

    expect(payload).toEqual({
      role: "Organization",
      username: "slucompsoc",
      full_name: "SLU Computer Society",
    });
    expect(result.role).toBe("Organization");
    expect(result.username).toBe("slucompsoc");
  });

  it("does not write when the profile is already complete", async () => {
    const profile = {
      id: "org-2",
      email: "org2@slu.edu",
      role: "Organization",
      username: "org2",
      full_name: "Org Two",
      avatar_url: "https://cdn.example.com/org2.png",
    };

    const result = await syncProfileFromMetadata("org-2", profile, {
      role: "Organization",
      username: "org2",
      full_name: "Org Two",
      avatar_url: "https://cdn.example.com/org2.png",
    });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result).toEqual(profile);
  });
});

describe("Organization record sync", () => {
  it("upserts organization rows linked to profile ids", async () => {
    let payload = null;

    supabase.from.mockImplementation((table) => {
      expect(table).toBe("organizations");
      return buildOrganizationUpsert(
        {
          data: {
            id: "organization-1",
            profile_id: "org-profile-1",
            username: "slucompsoc",
            name: "SLU Computer Society",
            description: "Campus builders",
            logo_url: "https://cdn.example.com/logo.png",
          },
          error: null,
        },
        (nextPayload) => {
          payload = nextPayload;
        }
      );
    });

    const result = await upsertOrganization("org-profile-1", {
      username: "slucompsoc",
      name: "SLU Computer Society",
      description: "Campus builders",
      logo_url: "https://cdn.example.com/logo.png",
    });

    expect(payload).toEqual({
      profile_id: "org-profile-1",
      username: "slucompsoc",
      name: "SLU Computer Society",
      description: "Campus builders",
      logo_url: "https://cdn.example.com/logo.png",
    });
    expect(result.id).toBe("organization-1");
  });

  it("creates organization sync payloads from profile and auth metadata", async () => {
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("organizations");
      return buildOrganizationUpsert(
        {
          data: {
            id: "organization-2",
            profile_id: "org-profile-2",
            username: "sluacm",
            name: "SLU ACM",
            description: "Engineering events",
            logo_url: null,
          },
          error: null,
        },
        () => {}
      );
    });

    const result = await syncOrganizationFromProfile(
      "org-profile-2",
      {
        role: "Organization",
        username: "sluacm",
        full_name: "SLU ACM",
      },
      {
        role: "Organization",
        organization_description: "Engineering events",
      }
    );

    expect(result).toMatchObject({
      id: "organization-2",
      profile_id: "org-profile-2",
      username: "sluacm",
      name: "SLU ACM",
    });
  });

  it("skips organization sync for non-organization profiles", async () => {
    const result = await syncOrganizationFromProfile(
      "student-profile-1",
      {
        role: "Student",
        username: "alex",
        full_name: "Alex Student",
      },
      {
        role: "Student",
      }
    );

    expect(result).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
