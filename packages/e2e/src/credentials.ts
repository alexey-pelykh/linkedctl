// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const CONFIG_FILE = ".linkedctl.yaml";

export interface E2ECredentials {
  accessToken: string;
  apiVersion: string;
}

/**
 * Returns `true` when E2E credentials are available via environment variables
 * or a `.linkedctl.yaml` file in the current working directory.
 */
export function hasCredentials(): boolean {
  if (
    process.env["LINKEDCTL_ACCESS_TOKEN"] !== undefined &&
    process.env["LINKEDCTL_ACCESS_TOKEN"] !== "" &&
    process.env["LINKEDCTL_API_VERSION"] !== undefined &&
    process.env["LINKEDCTL_API_VERSION"] !== ""
  ) {
    return true;
  }

  return existsSync(join(process.cwd(), CONFIG_FILE));
}

/**
 * Read E2E credentials from environment variables or `.linkedctl.yaml`.
 *
 * Priority: env vars > CWD `.linkedctl.yaml`
 *
 * @throws if credentials are not available.
 */
export function getCredentials(): E2ECredentials {
  // Try environment variables first
  const envAccessToken = process.env["LINKEDCTL_ACCESS_TOKEN"];
  const envApiVersion = process.env["LINKEDCTL_API_VERSION"];

  if (
    envAccessToken !== undefined &&
    envAccessToken !== "" &&
    envApiVersion !== undefined &&
    envApiVersion !== ""
  ) {
    return { accessToken: envAccessToken, apiVersion: envApiVersion };
  }

  // Fall back to CWD .linkedctl.yaml
  const configPath = join(process.cwd(), CONFIG_FILE);
  if (!existsSync(configPath)) {
    throw new Error(
      `No E2E credentials found. Set LINKEDCTL_ACCESS_TOKEN and LINKEDCTL_API_VERSION env vars, ` +
        `or create a ${CONFIG_FILE} file.`,
    );
  }

  const raw = readFileSync(configPath, "utf8");
  const config = parse(raw) as Record<string, unknown>;
  const oauth = config["oauth"] as Record<string, unknown> | undefined;

  const accessToken = oauth?.["access-token"];
  const apiVersion = config["api-version"];

  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error(`${CONFIG_FILE}: "oauth.access-token" is required and must be a non-empty string.`);
  }
  if (typeof apiVersion !== "string" || apiVersion === "") {
    throw new Error(`${CONFIG_FILE}: "api-version" is required and must be a non-empty string.`);
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
