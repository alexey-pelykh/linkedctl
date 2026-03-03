// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import {
  getDefaultConfigPath,
  readConfigFile,
  writeConfigFile,
  getProfile,
  setProfile,
  setDefaultProfile,
} from "@linkedctl/core";
import type { Profile } from "@linkedctl/core";

export function tokenCommand(): Command {
  const cmd = new Command("token");
  cmd.description("Store a direct access token in the active profile");
  cmd.requiredOption("--access-token <token>", "access token to store");

  cmd.action(async (_opts: { accessToken: string }, command: Command) => {
    const globals = command.optsWithGlobals<{ profile?: string | undefined; accessToken: string }>();
    const profileName = globals.profile ?? "default";
    const configPath = getDefaultConfigPath();
    let config = await readConfigFile(configPath);

    const existing = getProfile(config, profileName);
    const profile: Profile = {
      "access-token": globals.accessToken,
      "api-version": existing?.["api-version"] ?? "202501",
    };

    config = setProfile(config, profileName, profile);

    // Set as default if it's the first profile
    if (config["default-profile"] === undefined) {
      config = setDefaultProfile(config, profileName);
    }

    await writeConfigFile(configPath, config);
    console.log(`Access token stored in profile "${profileName}".`);
  });

  return cmd;
}
