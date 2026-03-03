// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { createCommand } from "./create.js";
import { listCommand } from "./list.js";
import { showCommand } from "./show.js";
import { deleteCommand } from "./delete.js";

export function profileCommand(): Command {
  const cmd = new Command("profile");
  cmd.description("Manage configuration profiles");

  cmd.addCommand(createCommand());
  cmd.addCommand(listCommand());
  cmd.addCommand(showCommand());
  cmd.addCommand(deleteCommand());

  return cmd;
}
