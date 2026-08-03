import { describe, expect, it } from "vitest";
import { isShareLinkExpired } from "../expiry";

describe("isShareLinkExpired", () => {
  it("returns false when there is no expiry", () => {
    expect(isShareLinkExpired(null)).toBe(false);
  });

  it("returns false for a future expiry", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isShareLinkExpired(future)).toBe(false);
  });

  it("returns true for a past expiry", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isShareLinkExpired(past)).toBe(true);
  });
});
