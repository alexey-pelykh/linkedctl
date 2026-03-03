// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { getDefaultConfigPath, readConfigFile, listProfiles } from "@linkedctl/core";

export function listCommand(): Command {
  const cmd = new Command("list");
  cmd.description("List all profiles");

  cmd.action(async () => {
    const config = await readConfigFile(getDefaultConfigPath());
    const names = listProfiles(config);

    if (names.length === 0) {
      console.log("No profiles configured.");
      return;
    }

    for (const name of names) {
      const marker = name === config["default-profile"] ? " (default)" : "";
      console.log(`${name}${marker}`);
    }
  });

  return cmd;
}
