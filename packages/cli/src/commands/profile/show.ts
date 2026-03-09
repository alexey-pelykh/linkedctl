// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { loadConfigFile, validateConfig, isValidProfileName } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

function redactSecret(value: string): string {
  if (value.length <= 8) {
    return "****";
  }
  return value.slice(0, 4) + "****" + value.slice(-4);
}

export function showCommand(): Command {
  const cmd = new Command("show");
  cmd.description("Show profile details (secrets redacted)");
  cmd.argument("<name>", "profile name");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (name: string, opts: Record<string, unknown>, actionCmd: Command) => {
    if (!isValidProfileName(name)) {
      throw new Error(`Invalid profile name "${name}". Names must not contain path separators or be empty.`);
    }

    const { raw, path } = await loadConfigFile({ profile: name });
    if (path === undefined) {
      throw new Error(`Profile "${name}" not found. Run "linkedctl profile list" to see available profiles.`);
    }

    const { config } = validateConfig(raw);
    const rootOpts = actionCmd.optsWithGlobals();
    const globalJson = rootOpts["json"] === true;
    const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globalJson);

    if (format === "json") {
      const data: Record<string, string | null> = {
        profile: name,
        clientId: config.oauth?.clientId !== undefined ? redactSecret(config.oauth.clientId) : null,
        clientSecret: config.oauth?.clientSecret !== undefined ? redactSecret(config.oauth.clientSecret) : null,
        accessToken: config.oauth?.accessToken !== undefined ? redactSecret(config.oauth.accessToken) : null,
        refreshToken: config.oauth?.refreshToken !== undefined ? redactSecret(config.oauth.refreshToken) : null,
        tokenExpiresAt: config.oauth?.tokenExpiresAt ?? null,
        apiVersion: config.apiVersion ?? null,
      };
      console.log(formatOutput(data, format));
    } else {
      const data: Record<string, string> = { profile: name };
      if (config.oauth?.clientId !== undefined) data["client-id"] = redactSecret(config.oauth.clientId);
      if (config.oauth?.clientSecret !== undefined) data["client-secret"] = redactSecret(config.oauth.clientSecret);
      if (config.oauth?.accessToken !== undefined) data["access-token"] = redactSecret(config.oauth.accessToken);
      if (config.oauth?.refreshToken !== undefined) data["refresh-token"] = redactSecret(config.oauth.refreshToken);
      if (config.oauth?.tokenExpiresAt !== undefined) data["token-expires-at"] = config.oauth.tokenExpiresAt;
      if (config.apiVersion !== undefined) data["api-version"] = config.apiVersion;
      console.log(formatOutput(data, format));
    }
  });

  return cmd;
}
