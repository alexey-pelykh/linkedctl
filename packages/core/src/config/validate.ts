// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedctlConfig, OAuthCredentials } from "./types.js";

export interface ValidationResult {
  config: LinkedctlConfig;
  warnings: string[];
  errors: string[];
}

const KNOWN_TOP_LEVEL_KEYS = new Set(["oauth", "api-version"]);
const KNOWN_OAUTH_KEYS = new Set(["client-id", "client-secret", "access-token", "refresh-token", "token-expires-at"]);

/**
 * Validate raw parsed YAML and produce a typed `LinkedctlConfig`.
 *
 * - Unknown keys produce warnings (forward-compatible).
 * - Wrong types produce errors.
 */
export function validateConfig(raw: unknown): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const config: LinkedctlConfig = {};

  if (raw === undefined || raw === null) {
    return { config, warnings, errors };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`Expected a YAML mapping, got ${Array.isArray(raw) ? "array" : typeof raw}`);
    return { config, warnings, errors };
  }

  const obj = raw as Record<string, unknown>;

  // Check for unknown top-level keys
  for (const key of Object.keys(obj)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      warnings.push(`Unknown config key: "${key}"`);
    }
  }

  // Validate api-version
  if ("api-version" in obj) {
    if (typeof obj["api-version"] === "string") {
      config.apiVersion = obj["api-version"];
    } else {
      errors.push(`"api-version" must be a string, got ${typeof obj["api-version"]}`);
    }
  }

  // Validate oauth section
  if ("oauth" in obj) {
    if (typeof obj["oauth"] !== "object" || obj["oauth"] === null || Array.isArray(obj["oauth"])) {
      errors.push(`"oauth" must be a mapping, got ${Array.isArray(obj["oauth"]) ? "array" : typeof obj["oauth"]}`);
    } else {
      const oauthObj = obj["oauth"] as Record<string, unknown>;
      const oauth: OAuthCredentials = {};

      // Check for unknown oauth keys
      for (const key of Object.keys(oauthObj)) {
        if (!KNOWN_OAUTH_KEYS.has(key)) {
          warnings.push(`Unknown oauth key: "${key}"`);
        }
      }

      // Validate each oauth field
      if ("client-id" in oauthObj) {
        if (typeof oauthObj["client-id"] === "string") {
          oauth.clientId = oauthObj["client-id"];
        } else {
          errors.push(`"oauth.client-id" must be a string, got ${typeof oauthObj["client-id"]}`);
        }
      }

      if ("client-secret" in oauthObj) {
        if (typeof oauthObj["client-secret"] === "string") {
          oauth.clientSecret = oauthObj["client-secret"];
        } else {
          errors.push(`"oauth.client-secret" must be a string, got ${typeof oauthObj["client-secret"]}`);
        }
      }

      if ("access-token" in oauthObj) {
        if (typeof oauthObj["access-token"] === "string") {
          oauth.accessToken = oauthObj["access-token"];
        } else {
          errors.push(`"oauth.access-token" must be a string, got ${typeof oauthObj["access-token"]}`);
        }
      }

      if ("refresh-token" in oauthObj) {
        if (typeof oauthObj["refresh-token"] === "string") {
          oauth.refreshToken = oauthObj["refresh-token"];
        } else {
          errors.push(`"oauth.refresh-token" must be a string, got ${typeof oauthObj["refresh-token"]}`);
        }
      }

      if ("token-expires-at" in oauthObj) {
        if (typeof oauthObj["token-expires-at"] === "string") {
          oauth.tokenExpiresAt = oauthObj["token-expires-at"];
        } else {
          errors.push(`"oauth.token-expires-at" must be a string, got ${typeof oauthObj["token-expires-at"]}`);
        }
      }

      config.oauth = oauth;
    }
  }

  return { config, warnings, errors };
}

/**
 * Check whether a profile name is safe for use as a filename.
 * Rejects path separators, `..`, and empty strings.
 */
export function isValidProfileName(name: string): boolean {
  if (name === "" || name === "." || name === "..") {
    return false;
  }
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    return false;
  }
  // Reject null bytes and control characters
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code <= 0x1f) {
      return false;
    }
  }
  return true;
}
