// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { homedir } from "node:os";
import { readdir } from "node:fs/promises";
import { Command } from "commander";
import { CONFIG_DIR } from "@linkedctl/core";

export function listCommand(): Command {
  const cmd = new Command("list");
  cmd.description("List all profiles");

  cmd.action(async () => {
    const profileDir = join(homedir(), CONFIG_DIR);
    let entries: string[];
    try {
      entries = await readdir(profileDir);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("No profiles configured.");
        return;
      }
      throw error;
    }

    const names = entries.filter((e) => e.endsWith(".yaml")).map((e) => e.replace(/\.yaml$/, ""));

    if (names.length === 0) {
      console.log("No profiles configured.");
      return;
    }

    for (const name of names) {
      console.log(name);
    }
  });

  return cmd;
}
