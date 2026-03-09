// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { parse } from "yaml";

export const CONFIG_DIR = ".linkedctl";
export const DEFAULT_API_VERSION = "202603";
const CONFIG_FILE = ".linkedctl.yaml";

export interface LoadResult {
  raw: unknown;
  path: string | undefined;
}

/**
 * Load a configuration file from disk.
 *
 * - With `profile`: loads `~/.linkedctl/{profile}.yaml`
 * - Without `profile`: tries CWD `.linkedctl.yaml`, then `~/.linkedctl.yaml`
 *
 * Returns `{ raw: undefined, path: undefined }` when no file is found.
 */
export async function loadConfigFile(options?: {
  profile?: string | undefined;
  cwd?: string | undefined;
  home?: string | undefined;
}): Promise<LoadResult> {
  const home = options?.home ?? homedir();
  const cwd = options?.cwd ?? process.cwd();

  if (options?.profile !== undefined) {
    const path = join(home, CONFIG_DIR, `${options.profile}.yaml`);
    return readYamlFile(path);
  }

  // Try CWD first
  const cwdPath = join(cwd, CONFIG_FILE);
  const cwdResult = await readYamlFile(cwdPath);
  if (cwdResult.path !== undefined) {
    return cwdResult;
  }

  // Fall back to home directory
  const homePath = join(home, CONFIG_FILE);
  return readYamlFile(homePath);
}

async function readYamlFile(path: string): Promise<LoadResult> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return { raw: undefined, path: undefined };
    }
    throw error;
  }

  const parsed: unknown = parse(raw);
  if (parsed === null || parsed === undefined) {
    return { raw: undefined, path };
  }

  return { raw: parsed, path };
}
