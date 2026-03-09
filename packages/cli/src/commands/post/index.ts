// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, InvalidArgumentError, Option } from "commander";
import { addMediaOptions, createCommand, createPostAction } from "./create.js";

export function postCommand(): Command {
  const cmd = new Command("post");
  cmd.description("Manage LinkedIn posts");

  cmd.enablePositionalOptions();

  cmd.argument("[text]", "shorthand: create a post with the given text (text > text-file > stdin)");
  cmd.option("--text <text>", "text content of the post (takes precedence over --text-file and positional argument)");
  cmd.option("--text-file <path>", "read post text from a UTF-8 file");
  cmd.addOption(
    new Option("--visibility <visibility>", "post visibility (PUBLIC or CONNECTIONS)")
      .choices(["PUBLIC", "CONNECTIONS"])
      .argParser((v: string) => {
        const normalized = v.toUpperCase();
        if (!["PUBLIC", "CONNECTIONS"].includes(normalized)) {
          throw new InvalidArgumentError("Allowed choices are PUBLIC, CONNECTIONS.");
        }
        return normalized;
      })
      .default("PUBLIC"),
  );
  addMediaOptions(cmd);
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl post "Hello from LinkedCtl!"
  linkedctl post --text "Hello" --visibility CONNECTIONS
  linkedctl post --text "Check this out" --image urn:li:image:C5608AQ...
  echo "Hello" | linkedctl post`,
  );

  cmd.action(async (text: string | undefined, opts: Record<string, unknown>, actionCmd: Command) => {
    await createPostAction(text, opts, actionCmd);
  });

  cmd.addCommand(createCommand());

  return cmd;
}
