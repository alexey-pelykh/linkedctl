// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, listComments, LinkedInApiError } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

export function createCommentListCommand(): Command {
  const cmd = new Command("list");
  cmd.description("List comments on a LinkedIn post");
  cmd.argument("<urn>", "post URN to list comments for (e.g. urn:li:share:...)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl comment list urn:li:share:123
  linkedctl comment list urn:li:share:123 --format json`,
  );

  cmd.action(async (urn: string, opts: { format?: string | undefined }, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      const comments = await listComments(client, { object: urn });

      const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
      const rows = comments.map((c) => ({
        urn: c.urn,
        actor: c.actor,
        message: c.message,
        createdAt: c.createdAt,
      }));
      const output = formatOutput(rows, format);
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to list comments: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
