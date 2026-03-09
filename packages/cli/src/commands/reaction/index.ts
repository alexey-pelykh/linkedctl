// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { createReactionCommand } from "./create.js";
import { listReactionsCommand } from "./list.js";
import { deleteReactionCommand } from "./delete.js";

export function reactionCommand(): Command {
  const cmd = new Command("reaction");
  cmd.description("Manage LinkedIn reactions");

  cmd.enablePositionalOptions();

  cmd.addCommand(createReactionCommand());
  cmd.addCommand(listReactionsCommand());
  cmd.addCommand(deleteReactionCommand());

  return cmd;
}
