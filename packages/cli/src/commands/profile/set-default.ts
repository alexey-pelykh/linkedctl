// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { getDefaultConfigPath, readConfigFile, writeConfigFile, getProfile, setDefaultProfile } from "@linkedctl/core";

export function setDefaultCommand(): Command {
  const cmd = new Command("set-default");
  cmd.description("Set the default profile");
  cmd.argument("<name>", "profile name");

  cmd.action(async (name: string) => {
    const configPath = getDefaultConfigPath();
    const config = await readConfigFile(configPath);

    if (getProfile(config, name) === undefined) {
      throw new Error(`Profile "${name}" not found.`);
    }

    const updated = setDefaultProfile(config, name);
    await writeConfigFile(configPath, updated);
    console.log(`Default profile set to "${name}".`);
  });

  return cmd;
}
