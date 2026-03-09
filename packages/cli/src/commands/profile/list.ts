// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { homedir } from "node:os";
import { readdir } from "node:fs/promises";
import { Command, Option } from "commander";
import { CONFIG_DIR, loadConfigFile, validateConfig, getTokenExpiry } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

interface ProfileInfo {
  name: string;
  status: "authenticated" | "expired" | "not configured";
  expiresAt?: string | undefined;
  expires?: string | undefined;
}

/**
 * Format the time delta between now and an expiry date as a human-readable string.
 * Future dates produce "in Xd Yh"; past dates produce "Xd Yh ago".
 */
function formatTimeDelta(expiresAt: Date): string {
  const diffMs = expiresAt.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);
  const totalMinutes = Math.floor(absDiffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  let duration: string;
  if (days > 0) {
    duration = hours > 0 ? `${String(days)}d ${String(hours)}h` : `${String(days)}d`;
  } else if (totalHours > 0) {
    const minutes = totalMinutes % 60;
    duration = minutes > 0 ? `${String(totalHours)}h ${String(minutes)}m` : `${String(totalHours)}h`;
  } else {
    duration = `${String(totalMinutes)}m`;
  }

  return diffMs >= 0 ? `in ${duration}` : `${duration} ago`;
}

async function getProfileStatus(name: string): Promise<ProfileInfo> {
  const { raw } = await loadConfigFile({ profile: name });
  if (raw === undefined) {
    return { name, status: "not configured" };
  }

  const { config } = validateConfig(raw);

  if (config.oauth?.accessToken === undefined || config.oauth.accessToken === "") {
    return { name, status: "not configured" };
  }

  const expiry = getTokenExpiry(config.oauth.accessToken);

  if (expiry === undefined) {
    return { name, status: "authenticated" };
  }

  if (expiry.isExpired) {
    return {
      name,
      status: "expired",
      expiresAt: expiry.expiresAt.toISOString(),
      expires: formatTimeDelta(expiry.expiresAt),
    };
  }

  return {
    name,
    status: "authenticated",
    expiresAt: expiry.expiresAt.toISOString(),
    expires: formatTimeDelta(expiry.expiresAt),
  };
}

export function listCommand(): Command {
  const cmd = new Command("list");
  cmd.description("List all profiles");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (opts: Record<string, unknown>) => {
    const profileDir = join(homedir(), CONFIG_DIR);
    let entries: string[];
    try {
      entries = await readdir(profileDir);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("No profiles configured.");
        return;
      }
      throw error;
    }

    const names = entries.filter((e) => e.endsWith(".yaml")).map((e) => e.replace(/\.yaml$/, ""));

    if (names.length === 0) {
      console.log("No profiles configured.");
      return;
    }

    const profiles = await Promise.all(names.map((name) => getProfileStatus(name)));

    const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout);

    const data =
      format === "json" ? profiles : profiles.map((p) => ({ name: p.name, status: p.status, expires: p.expires }));

    console.log(formatOutput(data, format));
  });

  return cmd;
}
