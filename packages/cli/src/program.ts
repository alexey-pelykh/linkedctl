// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { authCommand } from "./commands/auth/index.js";
import { completionCommand } from "./commands/completion.js";
import { mediaCommand } from "./commands/media/index.js";
import { postCommand } from "./commands/post/index.js";
import { profileCommand } from "./commands/profile/index.js";
import { reactionCommand } from "./commands/reaction/index.js";
import { whoamiCommand } from "./commands/whoami.js";

/**
 * Build and return the top-level Commander program.
 */
export function createProgram(version?: string): Command {
  const program = new Command("linkedctl");
  program.description("CLI for the LinkedIn API");
  if (version !== undefined) {
    program.version(version);
  }
  program.enablePositionalOptions();
  program.option("--profile <name>", "profile to use from config file");
  program.option("--json", "force JSON output on all data-producing commands");
  program.option("-q, --quiet", "suppress informational output");
  program.option("--no-color", "disable color output");

  program.hook("preAction", (thisCommand: Command) => {
    const opts = thisCommand.optsWithGlobals<{ quiet?: boolean }>();
    if (opts.quiet === true) {
      console.error = () => {};
      console.warn = () => {};
    }
  });

  program.addCommand(authCommand());
  program.addCommand(completionCommand(program));
  program.addCommand(mediaCommand());
  program.addCommand(postCommand());
  program.addCommand(profileCommand());
  program.addCommand(reactionCommand());
  program.addCommand(whoamiCommand());

  program.exitOverride();

  program.addHelpText(
    "after",
    "\nGet started: linkedctl auth setup" +
      "\n\nExit codes:" +
      "\n  0   success" +
      "\n  1   runtime error (API failure, network, auth)" +
      "\n  2   usage error (invalid arguments or options)",
  );

  return program;
}
