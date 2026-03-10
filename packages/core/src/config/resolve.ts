// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { ConfigResult, ResolveOptions } from "./types.js";
import { loadConfigFile } from "./loader.js";
import { validateConfig } from "./validate.js";
import { applyEnvOverlay } from "./env.js";
import { findProfilesWithScopes } from "./profiles.js";
import { PRODUCT_PRESETS } from "./products.js";

/**
 * Error thrown when configuration is invalid or incomplete.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Resolve configuration using the standard pipeline:
 *
 *   1. Load file (CWD/home fallback or profile-specific)
 *   2. Validate schema
 *   3. Overlay environment variables
 *   4. Verify credentials present
 *   5. Return config + warnings
 *
 * Throws `ConfigError` when validation fails or required credentials are missing.
 */
export async function resolveConfig(options?: ResolveOptions): Promise<ConfigResult> {
  // 1. Load file
  const { raw, path } = await loadConfigFile({
    profile: options?.profile,
    cwd: options?.cwd,
    home: options?.home,
  });

  // 2. Validate schema
  const { config: validated, warnings, errors } = validateConfig(raw);

  if (errors.length > 0) {
    const location = path !== undefined ? ` (from ${path})` : "";
    throw new ConfigError(`Config validation failed${location}: ${errors.join("; ")}`);
  }

  // 3. Overlay environment variables
  const config = applyEnvOverlay(validated, {
    profile: options?.profile,
    env: options?.env,
  });

  // 4. Verify credentials
  const accessToken = config.oauth?.accessToken;
  if (accessToken === undefined || accessToken === "") {
    const searchLocations = describeSearchLocations(options);
    throw new ConfigError(
      `No access token configured. Set LINKEDCTL_ACCESS_TOKEN, use --access-token, or create a config file. Searched: ${searchLocations}`,
    );
  }

  if (config.apiVersion === undefined || config.apiVersion === "") {
    throw new ConfigError(
      `No API version configured. Set LINKEDCTL_API_VERSION or add "api-version" to your config file.`,
    );
  }

  // 5. Validate required scopes
  const requiredScopes = options?.requiredScopes;
  const configuredScope = config.oauth?.scope;
  if (
    requiredScopes !== undefined &&
    requiredScopes.length > 0 &&
    configuredScope !== undefined &&
    configuredScope !== ""
  ) {
    const grantedScopes = configuredScope.split(" ");
    const missingScopes = requiredScopes.filter((s) => !grantedScopes.includes(s));
    if (missingScopes.length > 0) {
      const message = await buildScopeMismatchMessage(missingScopes, requiredScopes, {
        profile: options?.profile,
        home: options?.home,
      });
      throw new ConfigError(message);
    }
  }

  return { config, warnings };
}

function describeSearchLocations(options?: ResolveOptions): string {
  if (options?.profile !== undefined) {
    return `~/.linkedctl/${options.profile}.yaml`;
  }
  return ".linkedctl.yaml (CWD), ~/.linkedctl.yaml (home)";
}

/**
 * Build a helpful scope-mismatch error message.
 *
 * When other profiles already have the required scopes, suggests `--profile`.
 * Otherwise, suggests the exact `auth setup` command to create a new profile.
 * Also explains LinkedIn's product exclusivity constraint when relevant.
 */
async function buildScopeMismatchMessage(
  missingScopes: string[],
  requiredScopes: string[],
  options?: { profile?: string | undefined; home?: string | undefined },
): Promise<string> {
  const parts: string[] = [`Missing required OAuth scopes: ${missingScopes.join(", ")}.`];

  // Check if any existing profile already has the required scopes
  let matchingProfiles: string[] = [];
  try {
    matchingProfiles = await findProfilesWithScopes(requiredScopes, {
      home: options?.home,
      excludeProfile: options?.profile,
    });
  } catch {
    // If profile scanning fails, fall through to generic advice.
  }

  if (matchingProfiles.length > 0) {
    const profileList = matchingProfiles.map((p) => `--profile ${p}`).join(", ");
    parts.push(`Other profiles already have the required scopes: ${profileList}.`);
  } else {
    // Suggest the right auth setup command based on missing scopes
    const setupHint = suggestSetupCommand(missingScopes, options?.profile);
    parts.push(setupHint);
  }

  // Explain product exclusivity when scopes span multiple exclusive products
  if (involvesExclusiveProducts(requiredScopes)) {
    parts.push(
      "Note: LinkedIn enforces product exclusivity — the Community Management API " +
        "must be the sole product on a Developer App. Use separate profiles for " +
        "separate apps (e.g. --profile analytics).",
    );
  }

  return parts.join(" ");
}

/**
 * Suggest the appropriate `auth setup` command for the missing scopes.
 */
function suggestSetupCommand(missingScopes: string[], currentProfile: string | undefined): string {
  // Find a product preset that covers all missing scopes
  for (const [productId, preset] of Object.entries(PRODUCT_PRESETS)) {
    if (missingScopes.every((s) => preset.scopes.includes(s))) {
      const profileArg = currentProfile !== undefined ? ` --profile ${currentProfile}` : "";
      return `Run: linkedctl auth setup --product ${productId}${profileArg}`;
    }
  }

  // Generic fallback
  const profileArg = currentProfile !== undefined ? ` --profile ${currentProfile}` : "";
  return `Re-run "linkedctl auth setup${profileArg}" to configure the required scopes, then "linkedctl auth login" to re-authenticate.`;
}

/**
 * Check whether the required scopes span multiple exclusive LinkedIn products.
 * The Community Management API (`r_member_postAnalytics`) is exclusive and
 * cannot coexist with Share (`w_member_social`) on the same Developer App.
 */
function involvesExclusiveProducts(scopes: string[]): boolean {
  const hasCommunityManagement = scopes.includes("r_member_postAnalytics");
  const hasShare = scopes.includes("w_member_social");
  return hasCommunityManagement && hasShare;
}
