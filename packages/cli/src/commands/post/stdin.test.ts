// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Readable } from "node:stream";
import { describe, expect, it, vi, afterEach } from "vitest";
import { readStdin } from "./stdin.js";

describe("readStdin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads and trims data from stdin", async () => {
    const mockStdin = new Readable({
      read() {
        this.push("Hello from pipe\n");
        this.push(null);
      },
    });

    vi.spyOn(process, "stdin", "get").mockReturnValue(mockStdin as typeof process.stdin);

    const result = await readStdin();
    expect(result).toBe("Hello from pipe");
  });

  it("returns empty string when stdin is empty", async () => {
    const mockStdin = new Readable({
      read() {
        this.push(null);
      },
    });

    vi.spyOn(process, "stdin", "get").mockReturnValue(mockStdin as typeof process.stdin);

    const result = await readStdin();
    expect(result).toBe("");
  });

  it("concatenates multiple chunks", async () => {
    const mockStdin = new Readable({
      read() {
        this.push("chunk1 ");
        this.push("chunk2");
        this.push(null);
      },
    });

    vi.spyOn(process, "stdin", "get").mockReturnValue(mockStdin as typeof process.stdin);

    const result = await readStdin();
    expect(result).toBe("chunk1 chunk2");
  });
});
