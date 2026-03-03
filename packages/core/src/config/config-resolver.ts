// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { getProfile, readConfigFile, getDefaultConfigPath } from "./config-file.js";
import type { ResolvedConfig } from "./types.js";

/**
 * Values that may be supplied via CLI flags.
 */
export interface CliOverrides {
  profile?: string | undefined;
  accessToken?: string | undefined;
  apiVersion?: string | undefined;
}

/**
 * Environment-variable overrides. Defaults to `process.env` but
 * can be injected for testing.
 */
export interface EnvOverrides {
  LINKEDCTL_PROFILE?: string | undefined;
  LINKEDCTL_ACCESS_TOKEN?: string | undefined;
  LINKEDCTL_API_VERSION?: string | undefined;
}

/**
 * Resolve configuration using the standard precedence order:
 *
 *   CLI flags  >  environment variables  >  config file
 *
 * Throws when a required value (`accessToken`, `apiVersion`) cannot
 * be determined from any source.
 */
export async function resolveConfig(
  cli: CliOverrides = {},
  env: EnvOverrides = process.env as EnvOverrides,
  configPath: string = getDefaultConfigPath(),
): Promise<ResolvedConfig> {
  const config = await readConfigFile(configPath);

  // Determine which profile to use (CLI > env > config default)
  const profileName = cli.profile ?? env.LINKEDCTL_PROFILE ?? config["default-profile"] ?? "default";

  const profile = getProfile(config, profileName);

  // Resolve each value with precedence: CLI > env > config-profile
  const accessToken = cli.accessToken || env.LINKEDCTL_ACCESS_TOKEN || profile?.["access-token"];

  const apiVersion = cli.apiVersion || env.LINKEDCTL_API_VERSION || profile?.["api-version"];

  if (accessToken === undefined || accessToken === "") {
    throw new Error(
      `No access token configured. Set LINKEDCTL_ACCESS_TOKEN, use --access-token, or create a profile with "linkedctl profile create".`,
    );
  }
  if (apiVersion === undefined || apiVersion === "") {
    throw new Error(
      `No API version configured. Set LINKEDCTL_API_VERSION, use --api-version, or create a profile with "linkedctl profile create".`,
    );
  }

  return { accessToken, apiVersion, profile: profileName };
}
