// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Result of introspecting a token's expiry information.
 */
export interface TokenExpiry {
  expiresAt: Date;
  isExpired: boolean;
}

/**
 * Attempt to extract expiry information from a token by decoding it as a JWT.
 *
 * This performs a base64url decode of the payload section only — no signature
 * verification is performed.  Returns `undefined` when the token is not a
 * valid JWT or does not contain an `exp` claim.
 */
export function getTokenExpiry(token: string): TokenExpiry | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return undefined;
  }

  const payloadPart = parts[1];
  if (payloadPart === undefined || payloadPart === "") {
    return undefined;
  }

  let payload: unknown;
  try {
    const json = Buffer.from(payloadPart, "base64url").toString("utf-8");
    payload = JSON.parse(json) as unknown;
  } catch {
    return undefined;
  }

  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const exp = (payload as Record<string, unknown>)["exp"];
  if (typeof exp !== "number") {
    return undefined;
  }

  const expiresAt = new Date(exp * 1000);
  const isExpired = expiresAt.getTime() <= Date.now();

  return { expiresAt, isExpired };
}
