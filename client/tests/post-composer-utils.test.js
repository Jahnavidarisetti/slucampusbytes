import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
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
      validateComposerInput({ title: "Valid title", description: "Valid body" })
    ).toBeNull();
  });

  it("validates image format and file size", () => {
    const invalidTypeFile = { type: "application/pdf", size: 1000 };
    expect(isValidImageFile(invalidTypeFile).ok).toBe(false);

    const oversizedFile = { type: "image/png", size: 5 * 1024 * 1024 };
    expect(isValidImageFile(oversizedFile).ok).toBe(false);

    const validFile = { type: "image/png", size: 50 * 1024 };
    expect(isValidImageFile(validFile).ok).toBe(true);
  });
});

