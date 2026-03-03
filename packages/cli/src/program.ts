// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { profileCommand } from "./commands/profile/index.js";

/**
 * Build and return the top-level Commander program.
 */
export function createProgram(): Command {
  const program = new Command("linkedctl");
  program.description("CLI for the LinkedIn API");
  program.option("--profile <name>", "profile to use from config file");

  program.addCommand(profileCommand());

  return program;
}
