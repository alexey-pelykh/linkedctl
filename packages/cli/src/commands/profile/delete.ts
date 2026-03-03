// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { homedir } from "node:os";
import { unlink } from "node:fs/promises";
import { Command } from "commander";
import { isValidProfileName, CONFIG_DIR } from "@linkedctl/core";

export function deleteCommand(): Command {
  const cmd = new Command("delete");
  cmd.description("Delete a profile");
  cmd.argument("<name>", "profile name");

  cmd.action(async (name: string) => {
    if (!isValidProfileName(name)) {
      throw new Error(`Invalid profile name "${name}".`);
    }

    const profilePath = join(homedir(), CONFIG_DIR, `${name}.yaml`);

    try {
      await unlink(profilePath);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Profile "${name}" not found.`);
      }
      throw error;
    }

    console.log(`Profile "${name}" deleted.`);
  });

  return cmd;
}
