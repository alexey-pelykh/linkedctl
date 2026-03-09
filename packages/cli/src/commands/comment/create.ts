// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getCurrentPersonUrn, createComment, LinkedInApiError } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

interface CreateOpts {
  text: string;
  asOrg?: string | undefined;
  format?: string | undefined;
}

export function createCommentCreateCommand(): Command {
  const cmd = new Command("create");
  cmd.description("Create a comment on a LinkedIn post");
  cmd.argument("<urn>", "post URN to comment on (e.g. urn:li:share:...)");
  cmd.requiredOption("--text <text>", "comment text");
  cmd.option("--as-org <org-id>", "act as organization (numeric ID, e.g. 12345)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl comment create urn:li:share:123 --text "Great post!"
  linkedctl comment create urn:li:share:123 --text "Nice work" --format json
  linkedctl comment create urn:li:share:123 --text "Official reply" --as-org 12345`,
  );

  cmd.action(async (urn: string, opts: CreateOpts, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    const actorUrn = opts.asOrg !== undefined ? `urn:li:organization:${opts.asOrg}` : await getCurrentPersonUrn(client);

    try {
      const commentUrn = await createComment(client, {
        actor: actorUrn,
        object: urn,
        message: opts.text,
      });

      const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
      const output = formatOutput({ urn: commentUrn }, format);
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to create comment: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
