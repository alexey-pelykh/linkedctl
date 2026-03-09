// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * CLI exit codes.
 *
 * - {@link ExitCode.SUCCESS} (0) — command completed successfully
 * - {@link ExitCode.RUNTIME_ERROR} (1) — runtime failure (API, network, auth)
 * - {@link ExitCode.USAGE_ERROR} (2) — invalid arguments or options
 */
export const ExitCode = {
  SUCCESS: 0,
  RUNTIME_ERROR: 1,
  USAGE_ERROR: 2,
} as const;
