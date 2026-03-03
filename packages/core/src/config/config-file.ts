// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { parse, stringify } from "yaml";

import type { ConfigFile, Profile } from "./types.js";

const CONFIG_FILE_NAME = ".linkedctl.yaml";
const CONFIG_FILE_MODE = 0o600;

/**
 * Returns the default path to the configuration file: `~/.linkedctl.yaml`.
 */
export function getDefaultConfigPath(): string {
  return join(homedir(), CONFIG_FILE_NAME);
}

/**
 * Read and parse the YAML configuration file.
 *
 * Returns an empty config when the file does not exist.
 */
export async function readConfigFile(path: string): Promise<ConfigFile> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }

  const parsed: unknown = parse(raw);
  if (parsed === null || parsed === undefined) {
    return {};
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `Invalid config file: expected a YAML mapping, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
    );
  }
  return parsed as ConfigFile;
}

/**
 * Serialize the configuration and write it with `0600` permissions,
 * creating parent directories if necessary.
 */
export async function writeConfigFile(path: string, config: ConfigFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const content = stringify(config, { lineWidth: 120 });
  await writeFile(path, content, { mode: CONFIG_FILE_MODE });
}

/**
 * List all profile names stored in the configuration file.
 */
export function listProfiles(config: ConfigFile): string[] {
  return Object.keys(config.profiles ?? {});
}

/**
 * Get a profile by name, or `undefined` if it does not exist.
 */
export function getProfile(config: ConfigFile, name: string): Profile | undefined {
  return config.profiles?.[name];
}

/**
 * Add or overwrite a profile in the configuration.
 * Returns a **new** `ConfigFile` — the original is not mutated.
 */
export function setProfile(config: ConfigFile, name: string, profile: Profile): ConfigFile {
  return {
    ...config,
    profiles: {
      ...config.profiles,
      [name]: profile,
    },
  };
}

/**
 * Remove a profile from the configuration.
 * Returns a **new** `ConfigFile` — the original is not mutated.
 * If the removed profile was the default, `default-profile` is cleared.
 */
export function deleteProfile(config: ConfigFile, name: string): ConfigFile {
  const remaining = Object.fromEntries(Object.entries(config.profiles ?? {}).filter(([key]) => key !== name));
  return {
    ...config,
    "default-profile": config["default-profile"] === name ? undefined : config["default-profile"],
    profiles: remaining,
  };
}

/**
 * Set the default profile name.
 * Returns a **new** `ConfigFile` — the original is not mutated.
 *
 * This function does not validate that the profile exists in the
 * config — callers should verify existence before calling.
 */
export function setDefaultProfile(config: ConfigFile, name: string): ConfigFile {
  return {
    ...config,
    "default-profile": name,
  };
}

/**
 * Redact secrets from a profile for display.
 */
export function redactProfile(profile: Profile): Record<string, string> {
  const token = profile["access-token"];
  const redacted = token.length > 8 ? token.slice(0, 4) + "****" + token.slice(-4) : "****";
  return {
    "access-token": redacted,
    "api-version": profile["api-version"],
  };
}
