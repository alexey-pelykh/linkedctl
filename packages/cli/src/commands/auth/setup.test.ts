// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import * as readlinePromises from "node:readline/promises";
import * as fsPromises from "node:fs/promises";
import { setupCommand } from "./setup.js";
import { Command } from "commander";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

vi.mock("node:readline/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof readlinePromises>();
  return { ...actual };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>();
  return { ...actual };
});

/** Create a parent program with the --profile option, as setup traverses parent. */
function wrapInProgram(cmd: Command): Command {
  const auth = new Command("auth");
  auth.addCommand(cmd);
  const program = new Command("linkedctl");
  program.option("--profile <name>", "profile to use from config file");
  program.addCommand(auth);
  return program;
}

/**
 * Mock readline to simulate user input.
 * Returns answers in sequence for each `question()` call.
 */
function mockReadline(answers: string[]) {
  let callIndex = 0;
  const closeFn = vi.fn();

  vi.spyOn(readlinePromises, "createInterface").mockReturnValue({
    question: vi.fn().mockImplementation(() => {
      const answer = answers[callIndex] ?? "";
      callIndex++;
      return Promise.resolve(answer);
    }),
    close: closeFn,
  } as never);

  return { closeFn };
}

describe("auth setup", () => {
  let saveOAuthClientCredentialsSpy: ReturnType<typeof vi.spyOn>;
  let saveOAuthScopeSpy: ReturnType<typeof vi.spyOn>;
  let saveOAuthPkceSpy: ReturnType<typeof vi.spyOn>;
  let saveApiVersionSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let copyFileSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    saveOAuthClientCredentialsSpy = vi.spyOn(core, "saveOAuthClientCredentials").mockResolvedValue(undefined);
    saveOAuthScopeSpy = vi.spyOn(core, "saveOAuthScope").mockResolvedValue(undefined);
    saveOAuthPkceSpy = vi.spyOn(core, "saveOAuthPkce").mockResolvedValue(undefined);
    saveApiVersionSpy = vi.spyOn(core, "saveApiVersion").mockResolvedValue(undefined);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    copyFileSpy = vi.spyOn(fsPromises, "copyFile").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves credentials and scope with both products enabled", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthClientCredentialsSpy).toHaveBeenCalledWith(
        { clientId: "my-client-id", clientSecret: "my-client-secret" },
        undefined,
      );
      expect(saveOAuthScopeSpy).toHaveBeenCalledWith("openid profile email w_member_social", undefined);
    });
  });

  it("trims whitespace from input", () => {
    mockReadline(["  my-client-id  ", "  my-client-secret  ", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthClientCredentialsSpy).toHaveBeenCalledWith(
        { clientId: "my-client-id", clientSecret: "my-client-secret" },
        undefined,
      );
    });
  });

  it("throws when client ID is empty", async () => {
    mockReadline(["", "my-client-secret", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    await expect(program.parseAsync(["auth", "setup"], { from: "user" })).rejects.toThrow("Client ID cannot be empty.");
  });

  it("throws when client secret is empty", async () => {
    mockReadline(["my-client-id", "", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    await expect(program.parseAsync(["auth", "setup"], { from: "user" })).rejects.toThrow(
      "Client Secret cannot be empty.",
    );
  });

  it("throws when no products are selected", async () => {
    mockReadline(["my-client-id", "my-client-secret", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    await expect(program.parseAsync(["auth", "setup"], { from: "user" })).rejects.toThrow(
      "At least one LinkedIn product must be enabled",
    );
  });

  it("saves scope for Sign In only", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthScopeSpy).toHaveBeenCalledWith("openid profile email", undefined);
    });
  });

  it("saves scope for Share only", () => {
    mockReadline(["my-client-id", "my-client-secret", "n", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthScopeSpy).toHaveBeenCalledWith("w_member_social", undefined);
    });
  });

  it("respects --profile flag", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["--profile", "work", "auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthClientCredentialsSpy).toHaveBeenCalledWith(
        { clientId: "my-client-id", clientSecret: "my-client-secret" },
        { profile: "work" },
      );
      expect(saveOAuthScopeSpy).toHaveBeenCalledWith("openid profile email", { profile: "work" });
    });
  });

  it("prints setup instructions to stderr", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("https://www.linkedin.com/developers/apps");
      expect(output).toContain("Client ID");
      expect(output).toContain("Client Secret");
      expect(output).toContain("linkedctl auth login");
    });
  });

  it("prints profile label in success message", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["--profile", "personal", "auth", "setup"], { from: "user" }).then(() => {
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain('"personal"');
    });
  });

  it("copies logo to ~/Downloads and mentions it in instructions", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(copyFileSpy).toHaveBeenCalledOnce();
      const dest = copyFileSpy.mock.calls[0]?.[1] as string;
      expect(dest).toContain("linkedctl-logo.png");

      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("linkedctl-logo.png");
    });
  });

  it("saves pkce setting when enabled", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "y"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthPkceSpy).toHaveBeenCalledWith(true, undefined);
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("PKCE: enabled");
    });
  });

  it("saves pkce setting when disabled", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthPkceSpy).toHaveBeenCalledWith(false, undefined);
    });
  });

  it("saves default api-version", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveApiVersionSpy).toHaveBeenCalledWith("202501", undefined);
    });
  });

  it("saves api-version with profile flag", () => {
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["--profile", "work", "auth", "setup"], { from: "user" }).then(() => {
      expect(saveApiVersionSpy).toHaveBeenCalledWith("202501", { profile: "work" });
    });
  });

  it("skips logo mention when copy fails", () => {
    copyFileSpy.mockRejectedValue(new Error("ENOENT"));
    mockReadline(["my-client-id", "my-client-secret", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).not.toContain("linkedctl-logo.png");
      expect(output).toContain("App logo");
    });
  });
});
