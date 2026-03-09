// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { createCommentCreateCommand } from "./create.js";
import { createCommentListCommand } from "./list.js";
import { createCommentGetCommand } from "./get.js";
import { createCommentDeleteCommand } from "./delete.js";

export function commentCommand(): Command {
  const cmd = new Command("comment");
  cmd.description("Manage comments on LinkedIn posts");

  cmd.addCommand(createCommentCreateCommand());
  cmd.addCommand(createCommentListCommand());
  cmd.addCommand(createCommentGetCommand());
  cmd.addCommand(createCommentDeleteCommand());

  return cmd;
}
