// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { tokenCommand } from "./token.js";

export function authCommand(): Command {
  const cmd = new Command("auth");
  cmd.description("Manage authentication");

  cmd.addCommand(tokenCommand());

  return cmd;
}
