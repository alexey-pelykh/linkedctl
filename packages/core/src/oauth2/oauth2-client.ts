// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { OAuth2Config, OAuth2TokenResponse } from "./types.js";

const AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

/**
 * Build the LinkedIn OAuth2 authorization URL that the user should open in
 * their browser. Includes a `state` parameter for CSRF protection.
 */
export function buildAuthorizationUrl(config: OAuth2Config, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
  });
  return `${AUTHORIZATION_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and (optional) refresh tokens.
 */
export async function exchangeAuthorizationCode(config: OAuth2Config, code: string): Promise<OAuth2TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  return tokenRequest(body);
}

/**
 * Attempt to refresh an access token using a refresh token.
 */
export async function refreshAccessToken(config: OAuth2Config, refreshToken: string): Promise<OAuth2TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  return tokenRequest(body);
}

async function tokenRequest(body: URLSearchParams): Promise<OAuth2TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OAuth2 token request failed (HTTP ${response.status}): ${text}`);
  }

  const json = (await response.json()) as Record<string, unknown>;

  if (typeof json["access_token"] !== "string") {
    throw new Error("OAuth2 token response missing access_token");
  }

  return {
    accessToken: json["access_token"],
    expiresIn: typeof json["expires_in"] === "number" ? json["expires_in"] : 0,
    refreshToken: typeof json["refresh_token"] === "string" ? json["refresh_token"] : undefined,
    refreshTokenExpiresIn:
      typeof json["refresh_token_expires_in"] === "number" ? json["refresh_token_expires_in"] : undefined,
    scope: typeof json["scope"] === "string" ? json["scope"] : "",
  };
}
