// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { createProgram } from "./program.js";

describe("createProgram", () => {
  it("sets version when provided", () => {
    const program = createProgram("1.2.3");
    expect(program.version()).toBe("1.2.3");
  });

  it("does not set version when omitted", () => {
    const program = createProgram();
    expect(program.version()).toBeUndefined();
  });

  it("includes getting-started hint in help output", () => {
    const program = createProgram();
    let helpOutput = "";
    program.configureOutput({ writeOut: (str: string) => (helpOutput += str) });
    program.outputHelp();
    expect(helpOutput).toContain("Get started: linkedctl auth setup");
  });

  it("documents exit codes in help output", () => {
    const program = createProgram();
    let helpOutput = "";
    program.configureOutput({ writeOut: (str: string) => (helpOutput += str) });
    program.outputHelp();
    expect(helpOutput).toContain("Exit codes:");
    expect(helpOutput).toContain("0   success");
    expect(helpOutput).toContain("1   runtime error");
    expect(helpOutput).toContain("2   usage error");
  });

  it("throws CommanderError on unknown option instead of exiting", async () => {
    const program = createProgram();
    program.configureOutput({ writeErr: () => {} });

    await expect(program.parseAsync(["node", "linkedctl", "--unknown-option"])).rejects.toThrow(CommanderError);
  });

  it("throws CommanderError with exit code 0 for --help", async () => {
    const program = createProgram();
    program.configureOutput({ writeOut: () => {} });

    const error = await program.parseAsync(["node", "linkedctl", "--help"]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CommanderError);
    expect((error as CommanderError).exitCode).toBe(0);
  });

  it("registers --json global option", () => {
    const program = createProgram();
    let helpOutput = "";
    program.configureOutput({ writeOut: (str: string) => (helpOutput += str) });
    program.outputHelp();
    expect(helpOutput).toContain("--json");
  });

  it("registers --quiet / -q global option", () => {
    const program = createProgram();
    let helpOutput = "";
    program.configureOutput({ writeOut: (str: string) => (helpOutput += str) });
    program.outputHelp();
    expect(helpOutput).toContain("--quiet");
    expect(helpOutput).toContain("-q");
  });
});
