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

// Interactive question order:
//   [0] logo? [1] client-id [2] client-secret
//   [3] sign-in? [4] share? [5] community-management? [6] pkce?

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

  it("saves credentials and scope with Sign In and Share enabled", () => {
    // logo=n, id, secret, signIn=y, share=y, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "y", "n", "n"]);

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
    // logo=n, id (padded), secret (padded), signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "  my-client-id  ", "  my-client-secret  ", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthClientCredentialsSpy).toHaveBeenCalledWith(
        { clientId: "my-client-id", clientSecret: "my-client-secret" },
        undefined,
      );
    });
  });

  it("throws when client ID is empty", async () => {
    mockReadline(["n", "", "my-client-secret", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    await expect(program.parseAsync(["auth", "setup"], { from: "user" })).rejects.toThrow("Client ID cannot be empty.");
  });

  it("throws when client secret is empty", async () => {
    mockReadline(["n", "my-client-id", "", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    await expect(program.parseAsync(["auth", "setup"], { from: "user" })).rejects.toThrow(
      "Client Secret cannot be empty.",
    );
  });

  it("throws when no products are selected", async () => {
    // logo=n, id, secret, signIn=n, share=n, community=n
    mockReadline(["n", "my-client-id", "my-client-secret", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    await expect(program.parseAsync(["auth", "setup"], { from: "user" })).rejects.toThrow(
      "At least one LinkedIn product must be enabled",
    );
  });

  it("saves scope for Sign In only", () => {
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthScopeSpy).toHaveBeenCalledWith("openid profile email", undefined);
    });
  });

  it("saves scope for Share only (auto-includes openid scopes)", () => {
    // logo=n, id, secret, signIn=n, share=y, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "n", "y", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthScopeSpy).toHaveBeenCalledWith("w_member_social openid profile email", undefined);
    });
  });

  it("saves scope for Community Management only", () => {
    // logo=n, id, secret, signIn=n, share=n, community=y, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "n", "n", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthScopeSpy).toHaveBeenCalledWith("r_member_postAnalytics", undefined);
    });
  });

  it("warns when Community Management and Share are both selected", () => {
    // logo=n, id, secret, signIn=n, share=y, community=y, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "n", "y", "y", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("must be the sole product");
    });
  });

  it("respects --profile flag", () => {
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

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
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

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
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["--profile", "personal", "auth", "setup"], { from: "user" }).then(() => {
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain('"personal"');
    });
  });

  it("copies logo to ~/Downloads when user accepts", () => {
    // logo=y, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["y", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(copyFileSpy).toHaveBeenCalledOnce();
      const dest = copyFileSpy.mock.calls[0]?.[1] as string;
      expect(dest).toContain("linkedctl-logo.png");

      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("linkedctl-logo.png");
    });
  });

  it("does not copy logo when user declines", () => {
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(copyFileSpy).not.toHaveBeenCalled();

      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).not.toContain("linkedctl-logo.png");
      expect(output).toContain("App logo");
    });
  });

  it("saves pkce setting when enabled", () => {
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=y
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "y"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthPkceSpy).toHaveBeenCalledWith(true, undefined);
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("PKCE: enabled");
      expect(output).toContain("If login fails, re-run setup and answer No");
    });
  });

  it("saves pkce setting when disabled", () => {
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveOAuthPkceSpy).toHaveBeenCalledWith(false, undefined);
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).not.toContain("If login fails, re-run setup and answer No");
    });
  });

  it("saves default api-version", () => {
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      expect(saveApiVersionSpy).toHaveBeenCalledWith(core.DEFAULT_API_VERSION, undefined);
    });
  });

  it("saves api-version with profile flag", () => {
    // logo=n, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["n", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["--profile", "work", "auth", "setup"], { from: "user" }).then(() => {
      expect(saveApiVersionSpy).toHaveBeenCalledWith(core.DEFAULT_API_VERSION, { profile: "work" });
    });
  });

  it("shows error when logo copy fails after user accepts", () => {
    copyFileSpy.mockRejectedValue(new Error("ENOENT"));
    // logo=y, id, secret, signIn=y, share=n, community=n, pkce=n
    mockReadline(["y", "my-client-id", "my-client-secret", "y", "n", "n", "n"]);

    const program = wrapInProgram(setupCommand());
    return program.parseAsync(["auth", "setup"], { from: "user" }).then(() => {
      const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("Could not save logo");
      expect(output).not.toContain("linkedctl-logo.png");
      expect(output).toContain("App logo");
    });
  });

  describe("--product flag", () => {
    it("sets scopes for share product without interactive product questions", () => {
      // logo=n, id, secret, pkce=n (no product questions)
      mockReadline(["n", "my-client-id", "my-client-secret", "n"]);

      const program = wrapInProgram(setupCommand());
      return program.parseAsync(["auth", "setup", "--product", "share"], { from: "user" }).then(() => {
        expect(saveOAuthScopeSpy).toHaveBeenCalledWith("openid profile w_member_social", undefined);
      });
    });

    it("sets scopes for community-management product", () => {
      // logo=n, id, secret, pkce=n
      mockReadline(["n", "my-client-id", "my-client-secret", "n"]);

      const program = wrapInProgram(setupCommand());
      return program.parseAsync(["auth", "setup", "--product", "community-management"], { from: "user" }).then(() => {
        expect(saveOAuthScopeSpy).toHaveBeenCalledWith("r_member_postAnalytics", undefined);
      });
    });

    it("prints selected product and scopes", () => {
      // logo=n, id, secret, pkce=n
      mockReadline(["n", "my-client-id", "my-client-secret", "n"]);

      const program = wrapInProgram(setupCommand());
      return program.parseAsync(["auth", "setup", "--product", "share"], { from: "user" }).then(() => {
        const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
        expect(output).toContain('"share"');
        expect(output).toContain("openid profile w_member_social");
      });
    });

    it("respects --profile flag with --product", () => {
      // logo=n, id, secret, pkce=n
      mockReadline(["n", "my-client-id", "my-client-secret", "n"]);

      const program = wrapInProgram(setupCommand());
      return program
        .parseAsync(["--profile", "analytics", "auth", "setup", "--product", "community-management"], { from: "user" })
        .then(() => {
          expect(saveOAuthScopeSpy).toHaveBeenCalledWith("r_member_postAnalytics", { profile: "analytics" });
        });
    });
  });
});
