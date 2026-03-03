// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import {
  getDefaultConfigPath,
  readConfigFile,
  writeConfigFile,
  getProfile,
  setProfile,
  setDefaultProfile,
} from "@linkedctl/core";
import type { Profile } from "@linkedctl/core";

export function createCommand(): Command {
  const cmd = new Command("create");
  cmd.description("Create a new profile");
  cmd.argument("<name>", "profile name");
  cmd.requiredOption("--access-token <token>", "OAuth2 access token");
  cmd.requiredOption("--api-version <version>", "LinkedIn API version (e.g. 202501)");
  cmd.option("--set-default", "set this profile as the default");

  cmd.action(
    async (name: string, opts: { accessToken: string; apiVersion: string; setDefault?: boolean | undefined }) => {
      const configPath = getDefaultConfigPath();
      let config = await readConfigFile(configPath);

      if (getProfile(config, name) !== undefined) {
        throw new Error(`Profile "${name}" already exists. Delete it first or use a different name.`);
      }

      const profile: Profile = {
        "access-token": opts.accessToken,
        "api-version": opts.apiVersion,
      };

      config = setProfile(config, name, profile);

      // Set as default if requested or if it's the first profile
      const isFirstProfile = Object.keys(config.profiles ?? {}).length === 1;
      if (opts.setDefault === true || isFirstProfile) {
        config = setDefaultProfile(config, name);
      }

      await writeConfigFile(configPath, config);
      console.log(`Profile "${name}" created.`);
      if (config["default-profile"] === name) {
        console.log(`Set as default profile.`);
      }
    },
  );

  return cmd;
}
