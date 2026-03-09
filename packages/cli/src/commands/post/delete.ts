// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, deletePost, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";
import { confirmOrAbort } from "../../confirm.js";

export function deleteCommand(): Command {
  const cmd = new Command("delete");
  cmd.description("Delete a LinkedIn post");
  cmd.argument("<urn>", "post URN (e.g. urn:li:share:123)");
  cmd.option("-f, --force", "skip confirmation prompt");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (urn: string, opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    await confirmOrAbort(`Delete post "${urn}"?`, opts["force"] === true);

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      await deletePost(client, urn);

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);
      const output = formatOutput({ urn, status: "deleted" }, format);
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to delete post: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
