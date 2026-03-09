// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, updatePost, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

export function updateCommand(): Command {
  const cmd = new Command("update");
  cmd.description("Update a LinkedIn post's commentary text");
  cmd.argument("<urn>", "post URN (e.g. urn:li:share:123)");
  cmd.requiredOption("--text <text>", "new text content for the post");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (urn: string, opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      await updatePost(client, urn, { text: opts["text"] as string });

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);
      const output = formatOutput({ urn, status: "updated" }, format);
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to update post: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
