// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import * as readlinePromises from "node:readline/promises";
import { deleteCommand } from "./delete.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    homedir: vi.fn().mockReturnValue("/mock/home"),
  };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("node:readline/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof readlinePromises>();
  return { ...actual };
});

const { homedir } = await import("node:os");
const { unlink } = await import("node:fs/promises");

function mockReadline(answer: string) {
  const closeFn = vi.fn();

  vi.spyOn(readlinePromises, "createInterface").mockReturnValue({
    question: vi.fn().mockResolvedValue(answer),
    close: closeFn,
  } as never);

  return { closeFn };
}

describe("profile delete", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(homedir).mockReturnValue("/mock/home");
    vi.mocked(unlink).mockResolvedValue(undefined);
    originalIsTTY = process.stdin.isTTY;
    // Default to non-TTY so existing tests don't need prompts
    Object.defineProperty(process.stdin, "isTTY", { value: undefined, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, writable: true });
    vi.restoreAllMocks();
  });

  it("deletes a profile file", async () => {
    const cmd = deleteCommand();
    await cmd.parseAsync(["work"], { from: "user" });

    expect(vi.mocked(unlink)).toHaveBeenCalledWith(join("/mock/home", ".linkedctl", "work.yaml"));
    expect(consoleSpy).toHaveBeenCalledWith('Profile "work" deleted.');
  });

  it("throws when profile does not exist", async () => {
    const enoent = new Error("ENOENT") as NodeJS.ErrnoException;
    enoent.code = "ENOENT";
    vi.mocked(unlink).mockRejectedValue(enoent);

    const cmd = deleteCommand();
    await expect(cmd.parseAsync(["nonexistent"], { from: "user" })).rejects.toThrow(/not found/);
  });

  it("throws for invalid profile name", async () => {
    const cmd = deleteCommand();
    await expect(cmd.parseAsync(["../evil"], { from: "user" })).rejects.toThrow(/Invalid profile name/);
  });

  it("re-throws unexpected filesystem errors", async () => {
    const ioError = new Error("I/O error") as NodeJS.ErrnoException;
    ioError.code = "EIO";
    vi.mocked(unlink).mockRejectedValue(ioError);

    const cmd = deleteCommand();
    await expect(cmd.parseAsync(["work"], { from: "user" })).rejects.toThrow(/I\/O error/);
  });

  it("prompts for confirmation in TTY mode", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    mockReadline("y");

    const cmd = deleteCommand();
    await cmd.parseAsync(["work"], { from: "user" });

    expect(vi.mocked(unlink)).toHaveBeenCalledWith(join("/mock/home", ".linkedctl", "work.yaml"));
    expect(consoleSpy).toHaveBeenCalledWith('Profile "work" deleted.');
  });

  it("aborts when user declines confirmation", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    mockReadline("n");

    const cmd = deleteCommand();
    await expect(cmd.parseAsync(["work"], { from: "user" })).rejects.toThrow("Aborted.");
    expect(vi.mocked(unlink)).not.toHaveBeenCalled();
  });

  it("skips confirmation with --force flag", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });

    const cmd = deleteCommand();
    await cmd.parseAsync(["work", "--force"], { from: "user" });

    expect(vi.mocked(unlink)).toHaveBeenCalledWith(join("/mock/home", ".linkedctl", "work.yaml"));
    expect(consoleSpy).toHaveBeenCalledWith('Profile "work" deleted.');
  });

  it("skips confirmation in non-TTY mode", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: undefined, writable: true });

    const cmd = deleteCommand();
    await cmd.parseAsync(["work"], { from: "user" });

    expect(vi.mocked(unlink)).toHaveBeenCalledWith(join("/mock/home", ".linkedctl", "work.yaml"));
  });
});
