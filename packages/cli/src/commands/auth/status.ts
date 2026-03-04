// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { loadConfigFile, validateConfig, getTokenExpiry } from "@linkedctl/core";

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

  cmd.action(async (_opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;

    const { raw } = await loadConfigFile({ profile: profileFlag });
    const { config } = validateConfig(raw);
    const label = profileFlag ?? "default";

    if (config.oauth?.accessToken === undefined || config.oauth.accessToken === "") {
      console.log(`Profile: ${label}`);
      console.log("Status: not configured");
      console.error('Run "linkedctl auth login" to set up authentication.');
      return;
    }

    const expiry = getTokenExpiry(config.oauth.accessToken);

    console.log(`Profile: ${label}`);

    if (expiry === undefined) {
      console.log("Status: authenticated");
      console.log("Expiry: unknown (token is not a JWT)");
      return;
    }

    if (expiry.isExpired) {
      console.log("Status: expired");
      console.log(`Expired: ${expiry.expiresAt.toISOString()}`);
      console.error('Run "linkedctl auth login" to re-authenticate.');
      return;
    }

    const remaining = formatTimeRemaining(expiry.expiresAt);
    console.log("Status: authenticated");
    console.log(`Expires: ${expiry.expiresAt.toISOString()} (${remaining} remaining)`);
  });

  return cmd;
}
