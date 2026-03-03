// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { listCommand } from "./list.js";

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
    readdir: vi.fn().mockResolvedValue([]),
  };
});

const { homedir } = await import("node:os");
const { readdir } = await import("node:fs/promises");

describe("profile list", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(homedir).mockReturnValue("/mock/home");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows message when config dir does not exist", async () => {
    const enoent = new Error("ENOENT") as NodeJS.ErrnoException;
    enoent.code = "ENOENT";
    vi.mocked(readdir).mockRejectedValue(enoent);

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("No profiles configured.");
  });

  it("shows message when no yaml files exist", async () => {
    vi.mocked(readdir).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof readdir>>);

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("No profiles configured.");
  });

  it("lists profile names from yaml files", async () => {
    vi.mocked(readdir).mockResolvedValue(["personal.yaml", "work.yaml"] as unknown as Awaited<
      ReturnType<typeof readdir>
    >);

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("personal");
    expect(consoleSpy).toHaveBeenCalledWith("work");
  });

  it("ignores non-yaml files", async () => {
    vi.mocked(readdir).mockResolvedValue(["personal.yaml", "notes.txt", ".DS_Store"] as unknown as Awaited<
      ReturnType<typeof readdir>
    >);

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("personal");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("re-throws unexpected filesystem errors", async () => {
    const ioError = new Error("I/O error") as NodeJS.ErrnoException;
    ioError.code = "EIO";
    vi.mocked(readdir).mockRejectedValue(ioError);

    const cmd = listCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/I\/O error/);
  });
});
