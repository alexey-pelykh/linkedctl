// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import {
  getDefaultConfigPath,
  readConfigFile,
  writeConfigFile,
  getProfile,
  clearProfileCredentials,
} from "@linkedctl/core";

export function logoutCommand(): Command {
  const cmd = new Command("logout");
  cmd.description("Clear stored credentials from the active profile");

  cmd.action(async (_opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const configPath = getDefaultConfigPath();
    const config = await readConfigFile(configPath);

    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;
    const profileName = profileFlag ?? config["default-profile"] ?? "default";
    const profile = getProfile(config, profileName);

    if (profile === undefined) {
      throw new Error(`Profile "${profileName}" not found.`);
    }

    const updated = clearProfileCredentials(config, profileName);
    await writeConfigFile(configPath, updated);
    console.log(`Credentials cleared for profile "${profileName}".`);
  });

  return cmd;
}
