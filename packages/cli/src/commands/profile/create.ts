// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { homedir } from "node:os";
import { writeFile, mkdir } from "node:fs/promises";
import { Command } from "commander";
import { loadConfigFile, isValidProfileName, saveOAuthTokens, CONFIG_DIR } from "@linkedctl/core";

export function createCommand(): Command {
  const cmd = new Command("create");
  cmd.description("Create a new profile");
  cmd.argument("<name>", "profile name");
  cmd.requiredOption("--access-token <token>", "OAuth2 access token");
  cmd.requiredOption("--api-version <version>", "LinkedIn API version (e.g. 202501)");

  cmd.action(async (name: string, opts: { accessToken: string; apiVersion: string }) => {
    if (!isValidProfileName(name)) {
      throw new Error(`Invalid profile name "${name}". Names must not contain path separators or be empty.`);
    }

    const { path } = await loadConfigFile({ profile: name });
    if (path !== undefined) {
      throw new Error(`Profile "${name}" already exists. Delete it first or use a different name.`);
    }

    // Ensure the profile directory exists
    const profileDir = join(homedir(), CONFIG_DIR);
    await mkdir(profileDir, { recursive: true });

    // Write the initial config with api-version
    const profilePath = join(profileDir, `${name}.yaml`);
    await writeFile(profilePath, `api-version: "${opts.apiVersion}"\n`, { mode: 0o600 });

    // Save the access token (merges into existing file)
    await saveOAuthTokens({ accessToken: opts.accessToken }, { profile: name });

    console.log(`Profile "${name}" created.`);
  });

  return cmd;
}
