// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { getDefaultConfigPath, readConfigFile, getProfile, redactProfile } from "@linkedctl/core";

export function showCommand(): Command {
  const cmd = new Command("show");
  cmd.description("Show profile details (secrets redacted)");
  cmd.argument("<name>", "profile name");

  cmd.action(async (name: string) => {
    const config = await readConfigFile(getDefaultConfigPath());
    const profile = getProfile(config, name);

    if (profile === undefined) {
      throw new Error(`Profile "${name}" not found.`);
    }

    const redacted = redactProfile(profile);
    const isDefault = config["default-profile"] === name;

    console.log(`Profile: ${name}${isDefault ? " (default)" : ""}`);
    for (const [key, value] of Object.entries(redacted)) {
      console.log(`  ${key}: ${value}`);
    }
  });

  return cmd;
}
