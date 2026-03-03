// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { computeCodeChallenge, generateCodeVerifier } from "./pkce.js";

describe("generateCodeVerifier", () => {
  it("returns a base64url-encoded string of 43 characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifier.length).toBe(43);
  });

  it("generates unique values on each call", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe("computeCodeChallenge", () => {
  it("returns BASE64URL(SHA256(verifier))", () => {
    const verifier = "test-code-verifier";
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(computeCodeChallenge(verifier)).toBe(expected);
  });

  it("produces different challenges for different verifiers", () => {
    const a = computeCodeChallenge("verifier-a");
    const b = computeCodeChallenge("verifier-b");
    expect(a).not.toBe(b);
  });

  it("matches RFC 7636 appendix B test vector", () => {
    // RFC 7636 §Appendix B: code_verifier = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = computeCodeChallenge(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
