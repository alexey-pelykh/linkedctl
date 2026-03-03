// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { randomBytes, createHash } from "node:crypto";

/**
 * Generate a cryptographically random PKCE code verifier.
 * Per RFC 7636 §4.1: 43–128 characters from [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~".
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Compute a PKCE code challenge from a code verifier using the S256 method.
 * Per RFC 7636 §4.2: BASE64URL(SHA256(code_verifier)).
 */
export function computeCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}
