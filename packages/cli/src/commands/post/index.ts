// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { createCommand, createPostAction } from "./create.js";

export function postCommand(): Command {
  const cmd = new Command("post");
  cmd.description("Manage LinkedIn posts");

  cmd.argument("[text]", "shorthand: create a post with the given text");
  cmd.option("--format <format>", "output format (json or table)");

  cmd.action(async (text: string | undefined, opts: Record<string, unknown>, actionCmd: Command) => {
    await createPostAction(text, opts, actionCmd);
  });

  cmd.addCommand(createCommand());

  return cmd;
}
