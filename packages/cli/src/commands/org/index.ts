// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { getCommand } from "./get.js";
import { listCommand } from "./list.js";
import { followersCommand } from "./followers.js";

export function orgCommand(): Command {
  const cmd = new Command("org");
  cmd.description("Manage LinkedIn organizations");

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl org list
  linkedctl org get 12345
  linkedctl org followers 12345`,
  );

  cmd.addCommand(listCommand());
  cmd.addCommand(getCommand());
  cmd.addCommand(followersCommand());

  return cmd;
}
