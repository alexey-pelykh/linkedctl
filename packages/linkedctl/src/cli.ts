#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { createRequire } from "node:module";
import { Command, CommanderError } from "commander";
import { createProgram, ExitCode } from "@linkedctl/cli";
import { startStdioServer } from "@linkedctl/mcp/stdio";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = createProgram(version);

const mcpCommand = new Command("mcp");
mcpCommand.description("Start the MCP server on stdio transport");
mcpCommand.action(async () => {
  await startStdioServer();
});
program.addCommand(mcpCommand);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof CommanderError) {
    if (error.exitCode !== 0) {
      // Usage error — Commander already printed the message
      process.exitCode = ExitCode.USAGE_ERROR;
    }
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    process.exitCode = ExitCode.RUNTIME_ERROR;
  }
}
