// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as readlinePromises from "node:readline/promises";
import { confirmOrAbort } from "./confirm.js";

vi.mock("node:readline/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof readlinePromises>();
  return { ...actual };
});

function mockReadline(answer: string) {
  const closeFn = vi.fn();

  vi.spyOn(readlinePromises, "createInterface").mockReturnValue({
    question: vi.fn().mockResolvedValue(answer),
    close: closeFn,
  } as never);

  return { closeFn };
}

describe("confirmOrAbort", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdin.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, writable: true });
    vi.restoreAllMocks();
  });

  it("skips prompt when force is true", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const createInterfaceSpy = vi.spyOn(readlinePromises, "createInterface");

    await confirmOrAbort("Delete?", true);

    expect(createInterfaceSpy).not.toHaveBeenCalled();
  });

  it("skips prompt when stdin is not a TTY", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: undefined, writable: true });
    const createInterfaceSpy = vi.spyOn(readlinePromises, "createInterface");

    await confirmOrAbort("Delete?", false);

    expect(createInterfaceSpy).not.toHaveBeenCalled();
  });

  it("proceeds when user answers y", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const { closeFn } = mockReadline("y");

    await confirmOrAbort("Delete?", false);

    expect(closeFn).toHaveBeenCalled();
  });

  it("proceeds when user answers yes", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const { closeFn } = mockReadline("yes");

    await confirmOrAbort("Delete?", false);

    expect(closeFn).toHaveBeenCalled();
  });

  it("proceeds when user answers Y (case-insensitive)", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const { closeFn } = mockReadline("Y");

    await confirmOrAbort("Delete?", false);

    expect(closeFn).toHaveBeenCalled();
  });

  it("aborts when user answers n", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const { closeFn } = mockReadline("n");

    await expect(confirmOrAbort("Delete?", false)).rejects.toThrow("Aborted.");
    expect(closeFn).toHaveBeenCalled();
  });

  it("aborts when user presses enter (empty input)", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const { closeFn } = mockReadline("");

    await expect(confirmOrAbort("Delete?", false)).rejects.toThrow("Aborted.");
    expect(closeFn).toHaveBeenCalled();
  });

  it("includes message in prompt", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    mockReadline("y");

    await confirmOrAbort("Delete profile?", false);

    expect(vi.mocked(readlinePromises.createInterface)).toHaveBeenCalled();
  });
});
