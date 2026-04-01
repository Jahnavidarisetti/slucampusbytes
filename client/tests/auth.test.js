import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkUsernameAvailable,
  isSluEmail,
  normalizeEmail,
  resolveEmailFromIdentifier,
  validatePassword,
  validateUsername,
} from "../src/lib/supabaseAuth";
import { supabase } from "../src/supabaseClient";

vi.mock("../../client/src/supabaseClient", () => {
  return {
    supabase: {
      from: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    },
  };
});

const buildProfilesLookup = (response) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve(response),
    }),
  }),
});

const buildProfilesIdLookup = (response) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve(response),
    }),
  }),
});

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
      buildProfilesIdLookup({ data: null, error: null })
    );

    const available = await checkUsernameAvailable("unique_user");
    expect(available).toBe(true);
  });

  it("detects when username is taken", async () => {
    supabase.from.mockImplementation(() =>
      buildProfilesIdLookup({ data: { id: "123" }, error: null })
    );

    const available = await checkUsernameAvailable("taken_user");
    expect(available).toBe(false);
  });
});
