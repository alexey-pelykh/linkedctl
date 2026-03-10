// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { orgCommand } from "./org.js";
import { postCommand } from "./post.js";
import { meCommand } from "./me.js";

export function statsCommand(): Command {
  const cmd = new Command("stats");
  cmd.description("View analytics and statistics");

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl stats post urn:li:share:123
  linkedctl stats post urn:li:share:123 --org 12345
  linkedctl stats me
  linkedctl stats me --from 2024-05-01 --to 2024-05-31
  linkedctl stats org 12345
  linkedctl stats org 12345 --from 2025-01-01 --to 2025-06-01
  linkedctl stats org 12345 --from 2025-01-01 --to 2025-02-01 --granularity day`,
  );

  cmd.addCommand(postCommand());
  cmd.addCommand(meCommand());
  cmd.addCommand(orgCommand());

  return cmd;
}
