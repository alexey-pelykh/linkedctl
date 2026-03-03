// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { getDefaultConfigPath, readConfigFile, writeConfigFile, getProfile, deleteProfile } from "@linkedctl/core";

export function deleteCommand(): Command {
  const cmd = new Command("delete");
  cmd.description("Delete a profile");
  cmd.argument("<name>", "profile name");

  cmd.action(async (name: string) => {
    const configPath = getDefaultConfigPath();
    const config = await readConfigFile(configPath);

    if (getProfile(config, name) === undefined) {
      throw new Error(`Profile "${name}" not found.`);
    }

    const updated = deleteProfile(config, name);
    await writeConfigFile(configPath, updated);
    console.log(`Profile "${name}" deleted.`);
  });

  return cmd;
}
