// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * A single profile entry in the configuration file.
 */
export interface Profile {
  "access-token": string;
  "api-version": string;
}

/**
 * Root structure of the `~/.linkedctl.yaml` configuration file.
 */
export interface ConfigFile {
  "default-profile"?: string | undefined;
  profiles?: Record<string, Profile> | undefined;
}

/**
 * Resolved configuration produced by merging CLI flags, environment
 * variables, and the on-disk config file.
 */
export interface ResolvedConfig {
  accessToken: string;
  apiVersion: string;
  profile: string;
}
