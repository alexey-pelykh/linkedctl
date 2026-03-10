// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { parse, stringify } from "yaml";
import { existsSync } from "node:fs";

import { CONFIG_DIR } from "./loader.js";
import { isValidProfileName } from "./validate.js";

const CONFIG_FILE = ".linkedctl.yaml";
const CONFIG_FILE_MODE = 0o600;

export interface SaveOAuthTokensInput {
  accessToken: string;
  refreshToken?: string | undefined;
  tokenExpiresAt?: string | undefined;
}

export interface SaveOAuthClientCredentialsInput {
  clientId: string;
  clientSecret: string;
}

/**
 * Save OAuth tokens to the config file.
 * Updates `oauth.access-token`, `oauth.refresh-token`, `oauth.token-expires-at`.
 */
export async function saveOAuthTokens(
  tokens: SaveOAuthTokensInput,
  options?: { profile?: string | undefined; home?: string | undefined; cwd?: string | undefined },
): Promise<void> {
  const path = resolveWritePath(options);
  const raw = await loadRawConfig(path);

  raw["oauth"] = { ...(raw["oauth"] as Record<string, unknown> | undefined) };
  const oauth = raw["oauth"] as Record<string, unknown>;
  oauth["access-token"] = tokens.accessToken;
  if (tokens.refreshToken !== undefined) {
    oauth["refresh-token"] = tokens.refreshToken;
  }
  if (tokens.tokenExpiresAt !== undefined) {
    oauth["token-expires-at"] = tokens.tokenExpiresAt;
  }

  await writeYamlFile(path, raw);
}

/**
 * Save OAuth client credentials to the config file.
 * Updates `oauth.client-id`, `oauth.client-secret`.
 */
export async function saveOAuthClientCredentials(
  creds: SaveOAuthClientCredentialsInput,
  options?: { profile?: string | undefined; home?: string | undefined; cwd?: string | undefined },
): Promise<void> {
  const path = resolveWritePath(options);
  const raw = await loadRawConfig(path);

  raw["oauth"] = { ...(raw["oauth"] as Record<string, unknown> | undefined) };
  const oauth = raw["oauth"] as Record<string, unknown>;
  oauth["client-id"] = creds.clientId;
  oauth["client-secret"] = creds.clientSecret;

  await writeYamlFile(path, raw);
}

/**
 * Save OAuth scope to the config file.
 * Updates `oauth.scope`.
 */
export async function saveOAuthScope(
  scope: string,
  options?: { profile?: string | undefined; home?: string | undefined; cwd?: string | undefined },
): Promise<void> {
  const path = resolveWritePath(options);
  const raw = await loadRawConfig(path);

  raw["oauth"] = { ...(raw["oauth"] as Record<string, unknown> | undefined) };
  const oauth = raw["oauth"] as Record<string, unknown>;
  oauth["scope"] = scope;

  await writeYamlFile(path, raw);
}

/**
 * Save OAuth PKCE setting to the config file.
 * Updates `oauth.pkce`.
 */
export async function saveOAuthPkce(
  pkce: boolean,
  options?: { profile?: string | undefined; home?: string | undefined; cwd?: string | undefined },
): Promise<void> {
  const path = resolveWritePath(options);
  const raw = await loadRawConfig(path);

  raw["oauth"] = { ...(raw["oauth"] as Record<string, unknown> | undefined) };
  const oauth = raw["oauth"] as Record<string, unknown>;
  oauth["pkce"] = pkce;

  await writeYamlFile(path, raw);
}

/**
 * Save API version to the config file.
 * Updates `api-version`.
 */
export async function saveApiVersion(
  apiVersion: string,
  options?: { profile?: string | undefined; home?: string | undefined; cwd?: string | undefined },
): Promise<void> {
  const path = resolveWritePath(options);
  const raw = await loadRawConfig(path);

  raw["api-version"] = apiVersion;

  await writeYamlFile(path, raw);
}

/**
 * Clear OAuth tokens from the config file.
 * Removes `access-token`, `refresh-token`, `token-expires-at` from the oauth section
 * but preserves `client-id` and `client-secret`.
 */
export async function clearOAuthTokens(options?: {
  profile?: string | undefined;
  home?: string | undefined;
  cwd?: string | undefined;
}): Promise<void> {
  const path = resolveWritePath(options);
  const raw = await loadRawConfig(path);

  if (raw["oauth"] !== undefined && typeof raw["oauth"] === "object" && raw["oauth"] !== null) {
    const oauth = { ...(raw["oauth"] as Record<string, unknown>) };
    delete oauth["access-token"];
    delete oauth["refresh-token"];
    delete oauth["token-expires-at"];
    raw["oauth"] = oauth;
  }

  await writeYamlFile(path, raw);
}

function resolveWritePath(options?: {
  profile?: string | undefined;
  home?: string | undefined;
  cwd?: string | undefined;
}): string {
  const home = options?.home ?? homedir();
  const cwd = options?.cwd ?? process.cwd();

  if (options?.profile !== undefined) {
    if (!isValidProfileName(options.profile)) {
      throw new TypeError(`Invalid profile name: "${options.profile}"`);
    }
    return join(home, CONFIG_DIR, `${options.profile}.yaml`);
  }

  // Write to CWD config if it exists, otherwise home
  const cwdPath = join(cwd, CONFIG_FILE);
  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return join(home, CONFIG_FILE);
}

async function loadRawConfig(path: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(path, "utf-8");
    const parsed: unknown = parse(content);
    if (parsed !== null && parsed !== undefined && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeYamlFile(path: string, data: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const content = stringify(data, { lineWidth: 120 });
  await writeFile(path, content, { mode: CONFIG_FILE_MODE });
}
