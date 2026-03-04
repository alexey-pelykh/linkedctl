// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  revokeAccessToken,
} from "./oauth2-client.js";
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
  it("builds URL with required parameters", () => {
    const url = buildAuthorizationUrl(OAUTH2_CONFIG, "test-state");
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://www.linkedin.com/oauth/v2/authorization");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:9999/callback");
    expect(parsed.searchParams.get("scope")).toBe("openid profile");
    expect(parsed.searchParams.get("state")).toBe("test-state");
    expect(parsed.searchParams.has("code_challenge")).toBe(false);
  });

  it("includes PKCE parameters when codeChallenge is provided", () => {
    const url = buildAuthorizationUrl(OAUTH2_CONFIG, "test-state", "test-code-challenge");
    const parsed = new URL(url);

    expect(parsed.searchParams.get("code_challenge")).toBe("test-code-challenge");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
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
    expect(body.has("code_verifier")).toBe(false);

    expect(result.accessToken).toBe("new-access-token");
    expect(result.expiresIn).toBe(5184000);
    expect(result.refreshToken).toBe("new-refresh-token");
    expect(result.refreshTokenExpiresIn).toBe(31536000);
    expect(result.scope).toBe("openid profile");
  });

  it("includes code_verifier when provided", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600, scope: "openid" }));

    await exchangeAuthorizationCode(OAUTH2_CONFIG, "code", "my-verifier");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("code_verifier")).toBe("my-verifier");
    expect(body.get("client_secret")).toBe("test-client-secret");
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

describe("revokeAccessToken", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct parameters to revocation endpoint", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await revokeAccessToken("test-client-id", "test-client-secret", "my-access-token");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.linkedin.com/oauth/v2/revoke");
    expect(init.method).toBe("POST");

    const body = new URLSearchParams(init.body as string);
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("test-client-secret");
    expect(body.get("token")).toBe("my-access-token");
  });

  it("resolves on successful revocation", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(revokeAccessToken("cid", "csecret", "tok")).resolves.toBeUndefined();
  });

  it("throws on non-OK response", async () => {
    fetchSpy.mockResolvedValueOnce(textResponse("invalid_client", 401));

    await expect(revokeAccessToken("bad-id", "bad-secret", "tok")).rejects.toThrow(
      /OAuth2 token revocation failed \(HTTP 401\)/,
    );
  });
});

describe("form encoding", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("percent-encodes special characters in values correctly", async () => {
    const config: OAuth2Config = {
      clientId: "cid",
      clientSecret: "WPL_AP1.secret==",
      redirectUri: "http://127.0.0.1:9999/callback",
      scope: "openid",
    };

    fetchSpy.mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 3600, scope: "openid" }));

    await exchangeAuthorizationCode(config, "code");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);

    // Values are correctly decoded from standard percent-encoding
    expect(body.get("redirect_uri")).toBe("http://127.0.0.1:9999/callback");
    expect(body.get("client_secret")).toBe("WPL_AP1.secret==");
  });
});
