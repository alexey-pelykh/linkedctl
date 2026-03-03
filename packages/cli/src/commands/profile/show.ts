// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { loadConfigFile, validateConfig, isValidProfileName } from "@linkedctl/core";

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

  cmd.action(async (name: string) => {
    if (!isValidProfileName(name)) {
      throw new Error(`Invalid profile name "${name}".`);
    }

    const { raw, path } = await loadConfigFile({ profile: name });
    if (path === undefined) {
      throw new Error(`Profile "${name}" not found.`);
    }

    const { config } = validateConfig(raw);

    console.log(`Profile: ${name}`);

    if (config.oauth !== undefined) {
      if (config.oauth.clientId !== undefined) {
        console.log(`  client-id: ${redactSecret(config.oauth.clientId)}`);
      }
      if (config.oauth.clientSecret !== undefined) {
        console.log(`  client-secret: ${redactSecret(config.oauth.clientSecret)}`);
      }
      if (config.oauth.accessToken !== undefined) {
        console.log(`  access-token: ${redactSecret(config.oauth.accessToken)}`);
      }
      if (config.oauth.refreshToken !== undefined) {
        console.log(`  refresh-token: ${redactSecret(config.oauth.refreshToken)}`);
      }
      if (config.oauth.tokenExpiresAt !== undefined) {
        console.log(`  token-expires-at: ${config.oauth.tokenExpiresAt}`);
      }
    }

    if (config.apiVersion !== undefined) {
      console.log(`  api-version: ${config.apiVersion}`);
    }
  });

  return cmd;
}
