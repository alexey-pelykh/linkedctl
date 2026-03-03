// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizationUrl, exchangeAuthorizationCode, refreshAccessToken } from "./oauth2-client.js";
import type { OAuth2Config } from "./types.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

const OAUTH2_CONFIG: OAuth2Config = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "http://127.0.0.1:9999/callback",
  scope: "openid profile",
};

describe("buildAuthorizationUrl", () => {
  it("includes all required parameters", () => {
    const url = buildAuthorizationUrl(OAUTH2_CONFIG, "test-state");
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://www.linkedin.com/oauth/v2/authorization");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:9999/callback");
    expect(parsed.searchParams.get("scope")).toBe("openid profile");
    expect(parsed.searchParams.get("state")).toBe("test-state");
  });
});

describe("exchangeAuthorizationCode", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct parameters and parses token response", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        access_token: "new-access-token",
        expires_in: 5184000,
        refresh_token: "new-refresh-token",
        refresh_token_expires_in: 31536000,
        scope: "openid profile",
      }),
    );

    const result = await exchangeAuthorizationCode(OAUTH2_CONFIG, "auth-code-123");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.linkedin.com/oauth/v2/accessToken");
    expect(init.method).toBe("POST");

    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code-123");
    expect(body.get("redirect_uri")).toBe("http://127.0.0.1:9999/callback");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("test-client-secret");

    expect(result.accessToken).toBe("new-access-token");
    expect(result.expiresIn).toBe(5184000);
    expect(result.refreshToken).toBe("new-refresh-token");
    expect(result.refreshTokenExpiresIn).toBe(31536000);
    expect(result.scope).toBe("openid profile");
  });

  it("handles response without refresh token", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access-only",
        expires_in: 5184000,
        scope: "openid",
      }),
    );

    const result = await exchangeAuthorizationCode(OAUTH2_CONFIG, "code");

    expect(result.accessToken).toBe("access-only");
    expect(result.refreshToken).toBeUndefined();
    expect(result.refreshTokenExpiresIn).toBeUndefined();
  });

  it("throws on non-OK response", async () => {
    fetchSpy.mockResolvedValueOnce(textResponse("invalid_grant", 400));

    await expect(exchangeAuthorizationCode(OAUTH2_CONFIG, "bad-code")).rejects.toThrow(
      /OAuth2 token request failed \(HTTP 400\)/,
    );
  });

  it("throws when access_token is missing", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ error: "something_wrong" }));

    await expect(exchangeAuthorizationCode(OAUTH2_CONFIG, "code")).rejects.toThrow(/missing access_token/);
  });
});

describe("refreshAccessToken", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends refresh_token grant type", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        access_token: "refreshed-token",
        expires_in: 5184000,
        scope: "openid profile",
      }),
    );

    const result = await refreshAccessToken(OAUTH2_CONFIG, "old-refresh-token");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old-refresh-token");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("test-client-secret");

    expect(result.accessToken).toBe("refreshed-token");
  });

  it("throws on failed refresh", async () => {
    fetchSpy.mockResolvedValueOnce(textResponse("invalid_token", 401));

    await expect(refreshAccessToken(OAUTH2_CONFIG, "expired")).rejects.toThrow(/OAuth2 token request failed/);
  });
});
