// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { createInterface } from "node:readline/promises";

/**
 * Prompt the user for confirmation in interactive (TTY) mode.
 * Skips the prompt and proceeds when `--force` is set or stdin is not a TTY.
 * Throws if the user declines.
 */
export async function confirmOrAbort(message: string, force: boolean): Promise<void> {
  if (force || !process.stdin.isTTY) {
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    if (answer.trim().toLowerCase() !== "y" && answer.trim().toLowerCase() !== "yes") {
      throw new Error("Aborted.");
    }
  } finally {
    rl.close();
  }
}
