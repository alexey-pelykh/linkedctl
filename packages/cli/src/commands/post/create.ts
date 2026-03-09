// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile } from "node:fs/promises";

import { Command, InvalidArgumentError, Option } from "commander";
import { resolveConfig, LinkedInClient, getCurrentPersonUrn, createTextPost, LinkedInApiError } from "@linkedctl/core";
import type { PostVisibility } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";
import { readStdin } from "./stdin.js";

interface CreateOpts {
  text?: string | undefined;
  textFile?: string | undefined;
  visibility?: string | undefined;
  format?: string | undefined;
}

/**
 * Resolve the post text from --text option, --text-file, positional argument, or stdin.
 *
 * Precedence: --text > --text-file > positional argument > stdin.
 */
async function resolveText(
  textOpt: string | undefined,
  textFileOpt: string | undefined,
  textArg: string | undefined,
): Promise<string> {
  if (textOpt !== undefined && textOpt !== "") {
    return textOpt;
  }

  if (textFileOpt !== undefined && textFileOpt !== "") {
    const content = await readFile(textFileOpt, "utf-8");
    const trimmed = content.trim();
    if (trimmed !== "") {
      return trimmed;
    }
  }

  if (textArg !== undefined && textArg !== "") {
    return textArg;
  }

  if (!process.stdin.isTTY) {
    const stdin = await readStdin();
    if (stdin !== "") {
      return stdin;
    }
  }

  throw new Error(
    'No text provided. Use --text "message", --text-file <path>, pass text as an argument, or pipe text via stdin.',
  );
}

/**
 * Shared action handler for creating a text post.
 */
export async function createPostAction(textArg: string | undefined, opts: CreateOpts, cmd: Command): Promise<void> {
  const text = await resolveText(opts.text, opts.textFile, textArg);
  const globals = cmd.optsWithGlobals<{ profile?: string | undefined }>();

  const { config } = await resolveConfig({
    profile: globals.profile,
    requiredScopes: ["openid", "profile", "email", "w_member_social"],
  });
  // resolveConfig guarantees oauth.accessToken and apiVersion are defined
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  const authorUrn = await getCurrentPersonUrn(client);

  const visibility = (opts.visibility as PostVisibility | undefined) ?? "PUBLIC";

  try {
    const postUrn = await createTextPost(client, {
      author: authorUrn,
      text,
      visibility,
    });

    const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout);
    const output = formatOutput({ urn: postUrn }, format);
    console.log(output);
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
    throw error;
  }
}

export function createCommand(): Command {
  const cmd = new Command("create");
  cmd.description("Create a text post on LinkedIn (text: --text > --text-file > positional > stdin)");
  cmd.argument("[text]", "text content of the post");
  cmd.option("--text <text>", "text content of the post (takes precedence over --text-file and positional argument)");
  cmd.option("--text-file <path>", "read post text from a UTF-8 file");
  cmd.addOption(
    new Option("--visibility <visibility>", "post visibility (PUBLIC or CONNECTIONS)")
      .choices(["PUBLIC", "CONNECTIONS"])
      .argParser((v: string) => {
        const normalized = v.toUpperCase();
        if (!["PUBLIC", "CONNECTIONS"].includes(normalized)) {
          throw new InvalidArgumentError("Allowed choices are PUBLIC, CONNECTIONS.");
        }
        return normalized;
      })
      .default("PUBLIC"),
  );
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl post create "Hello from LinkedCtl!"
  linkedctl post create --text "Hello" --visibility CONNECTIONS
  echo "Hello" | linkedctl post create`,
  );

  cmd.action(async (text: string | undefined, opts: CreateOpts, actionCmd: Command) => {
    await createPostAction(text, opts, actionCmd);
  });

  return cmd;
}
