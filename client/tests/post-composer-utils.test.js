import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_TONE_OPTIONS,
  TITLE_MAX_LENGTH,
  isValidImageFile,
  validateComposerInput,
} from "../src/lib/postComposerUtils";

describe("post composer utils", () => {
  it("validates required title and description", () => {
    expect(validateComposerInput({ title: "", description: "" })).toMatch(
      /provide a title and description/i
    );
  });

  it("enforces title and description max lengths", () => {
    const longTitle = "a".repeat(TITLE_MAX_LENGTH + 1);
    const longDescription = "b".repeat(DESCRIPTION_MAX_LENGTH + 1);

    expect(
      validateComposerInput({ title: longTitle, description: "ok" })
    ).toMatch(/title must be/i);
    expect(
      validateComposerInput({ title: "ok", description: longDescription })
    ).toMatch(/description must be/i);
  });

  it("accepts valid payload", () => {
    expect(
      validateComposerInput({
        title: "Valid title",
        description: "Valid body",
        eventDate: "2099-05-15",
      })
    ).toBeNull();
  });

  it("rejects invalid event dates", () => {
    expect(
      validateComposerInput({
        title: "Valid title",
        description: "Valid body",
        eventDate: "2026-02-31",
      })
    ).toMatch(/event date/i);
  });

  it("rejects past event dates", () => {
    expect(
      validateComposerInput({
        title: "Valid title",
        description: "Valid body",
        eventDate: "2000-01-01",
      })
    ).toMatch(/past/i);
  });

  it("validates image format and file size", () => {
    const invalidTypeFile = { type: "application/pdf", size: 1000 };
    expect(isValidImageFile(invalidTypeFile).ok).toBe(false);

    const oversizedFile = { type: "image/png", size: 5 * 1024 * 1024 };
    expect(isValidImageFile(oversizedFile).ok).toBe(false);

    const validFile = { type: "image/png", size: 50 * 1024 };
    expect(isValidImageFile(validFile).ok).toBe(true);
  });

  it("exposes supported description tone options", () => {
    expect(DESCRIPTION_TONE_OPTIONS.map((option) => option.value)).toEqual([
      "professional",
      "friendly",
      "exciting",
      "concise",
    ]);
  });
});
