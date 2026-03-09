// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { resolveConfig, LinkedInClient, getCurrentPersonUrn, deleteReaction, LinkedInApiError } from "@linkedctl/core";

interface DeleteOpts {
  asOrg?: string | undefined;
}

export async function deleteReactionAction(entityUrn: string, opts: DeleteOpts, cmd: Command): Promise<void> {
  const globals = cmd.optsWithGlobals<{ profile?: string | undefined }>();

  const { config } = await resolveConfig({
    profile: globals.profile,
    requiredScopes: ["openid", "profile", "email", "w_member_social"],
  });
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  const actorUrn = opts.asOrg !== undefined ? `urn:li:organization:${opts.asOrg}` : await getCurrentPersonUrn(client);

  try {
    await deleteReaction(client, { entity: entityUrn, actor: actorUrn });
    console.log("Reaction deleted");
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to delete reaction: ${error.message}`);
    }
    throw error;
  }
}

export function deleteReactionCommand(): Command {
  const cmd = new Command("delete");
  cmd.description("Remove your reaction from a LinkedIn post");
  cmd.argument("<entity-urn>", "entity URN to remove reaction from (e.g. urn:li:share:abc123)");
  cmd.option("--as-org <org-id>", "act as organization (numeric ID, e.g. 12345)");

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl reaction delete urn:li:share:abc123
  linkedctl reaction delete urn:li:share:abc123 --as-org 12345`,
  );

  cmd.action(async (entityUrn: string, opts: DeleteOpts, actionCmd: Command) => {
    await deleteReactionAction(entityUrn, opts, actionCmd);
  });

  return cmd;
}
