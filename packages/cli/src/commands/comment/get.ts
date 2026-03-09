// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getComment, LinkedInApiError } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

export function createCommentGetCommand(): Command {
  const cmd = new Command("get");
  cmd.description("Get a specific comment on a LinkedIn post");
  cmd.argument("<comment-urn>", "comment URN (e.g. urn:li:comment:(urn:li:activity:123,456))");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl comment get "urn:li:comment:(urn:li:activity:123,456)"
  linkedctl comment get "urn:li:comment:(urn:li:activity:123,456)" --format json`,
  );

  cmd.action(async (commentUrn: string, opts: { format?: string | undefined }, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      const comment = await getComment(client, { commentUrn });

      const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
      const output = formatOutput(
        {
          urn: comment.urn,
          actor: comment.actor,
          object: comment.object,
          message: comment.message,
          createdAt: comment.createdAt,
        },
        format,
      );
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to get comment: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
