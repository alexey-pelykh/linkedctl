// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { setupCommand } from "./setup.js";
import { tokenCommand } from "./token.js";
import { statusCommand } from "./status.js";
import { logoutCommand } from "./logout.js";
import { revokeCommand } from "./revoke.js";
import { loginCommand } from "./login.js";
import { refreshCommand } from "./refresh.js";

export function authCommand(): Command {
  const cmd = new Command("auth");
  cmd.description("Manage authentication");

  cmd.addCommand(setupCommand());
  cmd.addCommand(tokenCommand());
  cmd.addCommand(statusCommand());
  cmd.addCommand(logoutCommand());
  cmd.addCommand(revokeCommand());
  cmd.addCommand(loginCommand());
  cmd.addCommand(refreshCommand());

  return cmd;
}
