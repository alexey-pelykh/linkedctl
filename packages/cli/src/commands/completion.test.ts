// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { completionCommand } from "./completion.js";

function createTestProgram(): Command {
  const program = new Command("linkedctl");
  program.option("--profile <name>", "profile to use");

  const auth = new Command("auth").description("Authentication commands");
  auth.addCommand(new Command("login").description("Log in"));
  auth.addCommand(new Command("logout").description("Log out").option("--all", "log out all"));
  program.addCommand(auth);

  program.addCommand(completionCommand(program));

  const whoami = new Command("whoami").description("Show current user").option("--format <format>", "output format");
  program.addCommand(whoami);

  return program;
}

describe("completion", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  describe("bash", () => {
    it("generates bash completion script", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "bash"], { from: "user" });

      expect(writeSpy).toHaveBeenCalledOnce();
      const output = writeSpy.mock.calls[0]?.[0] as string;

      expect(output).toContain("_linkedctl_completions");
      expect(output).toContain("complete -F _linkedctl_completions linkedctl");
      expect(output).toContain("auth");
      expect(output).toContain("whoami");
      expect(output).toContain("completion");
      expect(output).toContain("--profile");
    });

    it("includes subcommand completions", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "bash"], { from: "user" });

      const output = writeSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("login");
      expect(output).toContain("logout");
    });

    it("includes option completions for subcommands", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "bash"], { from: "user" });

      const output = writeSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("--all");
      expect(output).toContain("--format");
    });
  });

  describe("zsh", () => {
    it("generates zsh completion script", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "zsh"], { from: "user" });

      expect(writeSpy).toHaveBeenCalledOnce();
      const output = writeSpy.mock.calls[0]?.[0] as string;

      expect(output).toContain("#compdef linkedctl");
      expect(output).toContain("_linkedctl");
      expect(output).toContain("auth");
      expect(output).toContain("whoami");
    });

    it("includes subcommand and option completions", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "zsh"], { from: "user" });

      const output = writeSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("login");
      expect(output).toContain("logout");
      expect(output).toContain("--format");
    });
  });

  describe("fish", () => {
    it("generates fish completion script", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "fish"], { from: "user" });

      expect(writeSpy).toHaveBeenCalledOnce();
      const output = writeSpy.mock.calls[0]?.[0] as string;

      expect(output).toContain("complete -c linkedctl");
      expect(output).toContain("__fish_use_subcommand");
      expect(output).toContain("auth");
      expect(output).toContain("whoami");
    });

    it("includes subcommand completions for nested commands", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "fish"], { from: "user" });

      const output = writeSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("__fish_seen_subcommand_from auth");
      expect(output).toContain("login");
      expect(output).toContain("logout");
    });

    it("includes option completions", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "fish"], { from: "user" });

      const output = writeSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('-l "profile"');
      expect(output).toContain('-l "format"');
    });
  });

  describe("unsupported shell", () => {
    it("prints error and sets exit code for unsupported shell", async () => {
      const program = createTestProgram();
      await program.parseAsync(["completion", "powershell"], { from: "user" });

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Unsupported shell: powershell"));
      expect(process.exitCode).toBe(1);
    });
  });

  describe("help text", () => {
    it("includes shell argument in help", () => {
      const program = createTestProgram();
      const cmd = program.commands.find((c) => c.name() === "completion");
      expect(cmd).toBeDefined();
      const helpText = cmd?.helpInformation() ?? "";
      expect(helpText).toContain("shell");
      expect(helpText).toContain("bash, zsh, fish");
    });
  });
});
