// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedctlConfig } from "./types.js";

/**
 * Overlay environment variables onto a config.
 *
 * - Without `profile`: reads `LINKEDCTL_ACCESS_TOKEN`, `LINKEDCTL_CLIENT_ID`,
 *   `LINKEDCTL_CLIENT_SECRET`, `LINKEDCTL_API_VERSION`
 * - With `profile` (e.g. "work"): reads `LINKEDCTL_WORK_ACCESS_TOKEN`,
 *   `LINKEDCTL_WORK_CLIENT_ID`, etc. (profile uppercased, hyphens → underscores)
 *
 * Env vars take precedence over file values (overlay, not replace).
 */
export function applyEnvOverlay(
  config: LinkedctlConfig,
  options?: { profile?: string | undefined; env?: Record<string, string | undefined> | undefined },
): LinkedctlConfig {
  const env = options?.env ?? (process.env as Record<string, string | undefined>);
  const prefix = buildPrefix(options?.profile);

  const accessToken = env[`${prefix}ACCESS_TOKEN`];
  const clientId = env[`${prefix}CLIENT_ID`];
  const clientSecret = env[`${prefix}CLIENT_SECRET`];
  const apiVersion = env[`${prefix}API_VERSION`];

  const hasOauthOverride = accessToken !== undefined || clientId !== undefined || clientSecret !== undefined;

  const result: LinkedctlConfig = { ...config };

  if (apiVersion !== undefined) {
    result.apiVersion = apiVersion;
  }

  if (hasOauthOverride) {
    result.oauth = { ...config.oauth };
    if (accessToken !== undefined) {
      result.oauth.accessToken = accessToken;
    }
    if (clientId !== undefined) {
      result.oauth.clientId = clientId;
    }
    if (clientSecret !== undefined) {
      result.oauth.clientSecret = clientSecret;
    }
  }

  return result;
}

function buildPrefix(profile: string | undefined): string {
  if (profile === undefined) {
    return "LINKEDCTL_";
  }
  const normalized = profile.toUpperCase().replace(/-/g, "_");
  return `LINKEDCTL_${normalized}_`;
}
