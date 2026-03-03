#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { createProgram } from "@linkedctl/cli";
import { startStdioServer } from "@linkedctl/mcp/stdio";

const program = createProgram();

const mcpCommand = new Command("mcp");
mcpCommand.description("Start the MCP server on stdio transport");
mcpCommand.action(async () => {
  await startStdioServer();
});
program.addCommand(mcpCommand);

await program.parseAsync(process.argv);
