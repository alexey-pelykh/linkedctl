// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, afterEach } from "vitest";
import { getTokenExpiry } from "./token-introspection.js";

/**
 * Build a minimal JWT with the given payload claims.
 */
function buildJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "fake-signature";
  return `${header}.${body}.${signature}`;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getTokenExpiry", () => {
  it("returns expiry for a valid JWT with exp claim", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const token = buildJwt({ exp: futureExp, sub: "user123" });

    const result = getTokenExpiry(token);
    expect(result).toBeDefined();
    expect(result?.isExpired).toBe(false);
    expect(result?.expiresAt.getTime()).toBe(futureExp * 1000);
  });

  it("marks expired tokens correctly", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const token = buildJwt({ exp: pastExp });

    const result = getTokenExpiry(token);
    expect(result).toBeDefined();
    expect(result?.isExpired).toBe(true);
  });

  it("returns undefined for opaque (non-JWT) tokens", () => {
    expect(getTokenExpiry("AQVh7cKZ...opaque-token")).toBeUndefined();
  });

  it("returns undefined for tokens with wrong number of parts", () => {
    expect(getTokenExpiry("only-one-part")).toBeUndefined();
    expect(getTokenExpiry("two.parts")).toBeUndefined();
    expect(getTokenExpiry("four.parts.here.extra")).toBeUndefined();
  });

  it("returns undefined when payload is not valid JSON", () => {
    const header = Buffer.from("{}").toString("base64url");
    const token = `${header}.not-valid-base64!.sig`;
    expect(getTokenExpiry(token)).toBeUndefined();
  });

  it("returns undefined when payload has no exp claim", () => {
    const token = buildJwt({ sub: "user123", iat: 1000 });
    expect(getTokenExpiry(token)).toBeUndefined();
  });

  it("returns undefined when exp is not a number", () => {
    const token = buildJwt({ exp: "not-a-number" });
    expect(getTokenExpiry(token)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getTokenExpiry("")).toBeUndefined();
  });

  it("returns undefined when payload is not an object", () => {
    const header = Buffer.from("{}").toString("base64url");
    const body = Buffer.from('"just a string"').toString("base64url");
    const token = `${header}.${body}.sig`;
    expect(getTokenExpiry(token)).toBeUndefined();
  });

  it("returns undefined when payload is null", () => {
    const header = Buffer.from("{}").toString("base64url");
    const body = Buffer.from("null").toString("base64url");
    const token = `${header}.${body}.sig`;
    expect(getTokenExpiry(token)).toBeUndefined();
  });

  it("handles token expiring at exact boundary", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    vi.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);

    const token = buildJwt({ exp: nowSeconds });
    const result = getTokenExpiry(token);
    expect(result).toBeDefined();
    expect(result?.isExpired).toBe(true);
  });
});
