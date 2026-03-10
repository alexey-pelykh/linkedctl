// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

import { CONFIG_DIR } from "./loader.js";
import { loadConfigFile } from "./loader.js";
import { validateConfig } from "./validate.js";

/**
 * Summary of a profile's configured OAuth scopes.
 */
export interface ProfileScopeSummary {
  /** Profile name (filename without `.yaml` extension). */
  name: string;
  /** Space-separated scope string, or `undefined` when not configured. */
  scope: string | undefined;
}

/**
 * List all profiles and their configured scopes.
 *
 * Reads `~/.linkedctl/*.yaml` and extracts the `oauth.scope` value from each.
 * Profiles that fail to load or validate are silently skipped.
 */
export async function listProfileScopes(options?: { home?: string | undefined }): Promise<ProfileScopeSummary[]> {
  const home = options?.home ?? homedir();
  const profileDir = join(home, CONFIG_DIR);

  let entries: string[];
  try {
    entries = await readdir(profileDir);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const names = entries.filter((e) => e.endsWith(".yaml")).map((e) => e.replace(/\.yaml$/, ""));
  const results: ProfileScopeSummary[] = [];

  for (const name of names) {
    try {
      const { raw } = await loadConfigFile({ profile: name, home });
      if (raw === undefined) {
        continue;
      }
      const { config } = validateConfig(raw);
      results.push({ name, scope: config.oauth?.scope });
    } catch {
      // Skip profiles that cannot be loaded or validated.
    }
  }

  return results;
}

/**
 * Find profiles whose configured scopes include all of the given required scopes.
 */
export async function findProfilesWithScopes(
  requiredScopes: string[],
  options?: { home?: string | undefined; excludeProfile?: string | undefined },
): Promise<string[]> {
  const profiles = await listProfileScopes({ home: options?.home });
  const matching: string[] = [];

  for (const profile of profiles) {
    if (options?.excludeProfile !== undefined && profile.name === options.excludeProfile) {
      continue;
    }
    if (profile.scope === undefined) {
      continue;
    }
    const granted = profile.scope.split(" ");
    if (requiredScopes.every((s) => granted.includes(s))) {
      matching.push(profile.name);
    }
  }

  return matching;
}
