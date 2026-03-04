// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * OAuth2 credentials stored in a config file.
 */
export interface OAuthCredentials {
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  accessToken?: string | undefined;
  refreshToken?: string | undefined;
  tokenExpiresAt?: string | undefined;
  scope?: string | undefined;
  pkce?: boolean | undefined;
}

/**
 * Configuration for a single linkedctl profile.
 * Each YAML file represents one profile (no profiles map wrapper).
 */
export interface LinkedctlConfig {
  oauth?: OAuthCredentials | undefined;
  apiVersion?: string | undefined;
}

/**
 * Result of resolving configuration: validated config plus any warnings.
 */
export interface ConfigResult {
  config: LinkedctlConfig;
  warnings: string[];
}

/**
 * Options for resolving configuration.
 */
export interface ResolveOptions {
  profile?: string | undefined;
  cwd?: string | undefined;
  home?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
}
