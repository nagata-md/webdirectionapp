import { describe, expect, it } from "vitest";
import { hashSharePassword, verifySharePassword } from "../password";

describe("share password hashing", () => {
  it("verifies the correct password", () => {
    const stored = hashSharePassword("correct-horse");
    expect(verifySharePassword("correct-horse", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashSharePassword("correct-horse");
    expect(verifySharePassword("wrong-password", stored)).toBe(false);
  });

  it("produces a different hash each time (random salt)", () => {
    const a = hashSharePassword("same-password");
    const b = hashSharePassword("same-password");
    expect(a).not.toBe(b);
    expect(verifySharePassword("same-password", a)).toBe(true);
    expect(verifySharePassword("same-password", b)).toBe(true);
  });

  it("rejects malformed stored values", () => {
    expect(verifySharePassword("anything", "not-a-valid-hash")).toBe(false);
  });
});
