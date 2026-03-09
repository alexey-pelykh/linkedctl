// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { loadConfigFile, validateConfig, getTokenExpiry } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

/**
 * Format remaining time until token expiry as a human-readable string.
 */
function formatTimeRemaining(expiresAt: Date): string {
  const diffMs = expiresAt.getTime() - Date.now();
  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return hours > 0 ? `${String(days)}d ${String(hours)}h` : `${String(days)}d`;
  }
  if (totalHours > 0) {
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${String(totalHours)}h ${String(minutes)}m` : `${String(totalHours)}h`;
  }
  return `${String(totalMinutes)}m`;
}

export function statusCommand(): Command {
  const cmd = new Command("status");
  cmd.description("Show authentication status for the active profile");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;

    const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout);
    const { raw } = await loadConfigFile({ profile: profileFlag });
    const { config } = validateConfig(raw);
    const label = profileFlag ?? "default";

    if (config.oauth?.accessToken === undefined || config.oauth.accessToken === "") {
      const data =
        format === "json"
          ? { profile: label, status: "not configured", expiresAt: null, remainingSeconds: null }
          : { profile: label, status: "not configured" };
      console.log(formatOutput(data, format));
      console.error('Run "linkedctl auth login" to set up authentication.');
      return;
    }

    const expiry = getTokenExpiry(config.oauth.accessToken);

    if (expiry === undefined) {
      const data =
        format === "json"
          ? { profile: label, status: "authenticated", expiresAt: null, remainingSeconds: null }
          : { profile: label, status: "authenticated", expires: "unknown (token is not a JWT)" };
      console.log(formatOutput(data, format));
      return;
    }

    if (expiry.isExpired) {
      const data =
        format === "json"
          ? {
              profile: label,
              status: "expired",
              expiresAt: expiry.expiresAt.toISOString(),
              remainingSeconds: 0,
            }
          : { profile: label, status: "expired", expires: expiry.expiresAt.toISOString() };
      console.log(formatOutput(data, format));
      console.error('Run "linkedctl auth login" to re-authenticate.');
      return;
    }

    const remainingMs = expiry.expiresAt.getTime() - Date.now();
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const remaining = formatTimeRemaining(expiry.expiresAt);
    const data =
      format === "json"
        ? {
            profile: label,
            status: "authenticated",
            expiresAt: expiry.expiresAt.toISOString(),
            remainingSeconds,
          }
        : {
            profile: label,
            status: "authenticated",
            expires: `${expiry.expiresAt.toISOString()} (${remaining} remaining)`,
          };
    console.log(formatOutput(data, format));
  });

  return cmd;
}
