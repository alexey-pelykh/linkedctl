// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { resolveConfig, LinkedInClient, deleteComment, LinkedInApiError } from "@linkedctl/core";

export function createCommentDeleteCommand(): Command {
  const cmd = new Command("delete");
  cmd.description("Delete a comment on a LinkedIn post");
  cmd.argument("<comment-urn>", "comment URN to delete (e.g. urn:li:comment:(urn:li:activity:123,456))");

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl comment delete "urn:li:comment:(urn:li:activity:123,456)"`,
  );

  cmd.action(async (commentUrn: string, _opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; quiet?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      await deleteComment(client, { commentUrn });
      console.error("Comment deleted.");
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to delete comment: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
