// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Supported output formats.
 */
export type OutputFormat = "json" | "table";

/**
 * Detect the default output format based on whether the stream is a TTY.
 * TTY streams default to "table"; piped streams default to "json".
 */
export function detectFormat(stream: { isTTY?: boolean }): OutputFormat {
  return stream.isTTY === true ? "table" : "json";
}

/**
 * Resolve the effective output format.
 *
 * Precedence: per-command `--format` > global `--json` > TTY auto-detection.
 */
export function resolveFormat(
  explicit: OutputFormat | undefined,
  stream: { isTTY?: boolean },
  globalJson?: boolean,
): OutputFormat {
  if (explicit !== undefined) {
    return explicit;
  }
  if (globalJson === true) {
    return "json";
  }
  return detectFormat(stream);
}
