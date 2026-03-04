// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { ConfigResult, ResolveOptions } from "./types.js";
import { loadConfigFile } from "./loader.js";
import { validateConfig } from "./validate.js";
import { applyEnvOverlay } from "./env.js";

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
      throw new ConfigError(
        `Missing required OAuth scopes: ${missingScopes.join(", ")}. Re-run "linkedctl auth setup" to configure the required scopes, then "linkedctl auth login" to re-authenticate.`,
      );
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
