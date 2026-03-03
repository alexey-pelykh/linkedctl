// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
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

const { homedir } = await import("node:os");
const { unlink } = await import("node:fs/promises");

describe("profile delete", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(homedir).mockReturnValue("/mock/home");
    vi.mocked(unlink).mockResolvedValue(undefined);
  });

  afterEach(() => {
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
});
