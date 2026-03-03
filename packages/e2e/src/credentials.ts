// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse } from "yaml";

const CONFIG_FILENAME = ".linkedctl-e2e.yaml";

export interface E2ECredentials {
  accessToken: string;
  apiVersion: string;
}

/**
 * Search upward from `cwd` for a `.linkedctl-e2e.yaml` configuration file.
 * Returns the absolute path if found, or `undefined` otherwise.
 */
function findConfigFile(from: string = process.cwd()): string | undefined {
  let dir = resolve(from);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const candidate = join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

/**
 * Returns `true` when a `.linkedctl-e2e.yaml` file is reachable from the
 * current working directory (searching upward).
 */
export function hasCredentials(): boolean {
  return findConfigFile() !== undefined;
}

/**
 * Read and parse E2E credentials from the nearest `.linkedctl-e2e.yaml`.
 *
 * @throws if the file is missing or does not contain the required fields.
 */
export function getCredentials(): E2ECredentials {
  const configPath = findConfigFile();
  if (configPath === undefined) {
    throw new Error(`No ${CONFIG_FILENAME} found. Create one with "access-token" and "api-version" fields.`);
  }

  const raw = readFileSync(configPath, "utf8");
  const config = parse(raw) as Record<string, unknown>;

  const accessToken = config["access-token"];
  const apiVersion = config["api-version"];

  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error(`${CONFIG_FILENAME}: "access-token" is required and must be a non-empty string.`);
  }
  if (typeof apiVersion !== "string" || apiVersion === "") {
    throw new Error(`${CONFIG_FILENAME}: "api-version" is required and must be a non-empty string.`);
  }

  return { accessToken, apiVersion };
}

/**
 * Return environment variables suitable for spawning a `linkedctl` CLI
 * subprocess with E2E credentials.
 */
export function cliEnv(): Record<string, string> {
  const creds = getCredentials();
  return {
    LINKEDCTL_ACCESS_TOKEN: creds.accessToken,
    LINKEDCTL_API_VERSION: creds.apiVersion,
  };
}
