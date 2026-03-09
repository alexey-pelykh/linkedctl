// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

import { Command, Option } from "commander";
import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  uploadDocument,
  LinkedInApiError,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_SIZE_BYTES,
} from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

interface UploadDocumentOpts {
  format?: string | undefined;
}

export function uploadDocumentCommand(): Command {
  const cmd = new Command("upload-document");
  cmd.description("Upload a document to LinkedIn (PDF, DOCX, PPTX, DOC, PPT; max 100 MB)");
  cmd.argument("<file>", "path to the document file");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl media upload-document deck.pdf
  linkedctl media upload-document proposal.docx --format json`,
  );

  cmd.action(async (file: string, opts: UploadDocumentOpts, actionCmd: Command) => {
    await uploadDocumentAction(file, opts, actionCmd);
  });

  return cmd;
}

export async function uploadDocumentAction(file: string, opts: UploadDocumentOpts, cmd: Command): Promise<void> {
  const ext = extname(file).toLowerCase();
  if (!DOCUMENT_EXTENSIONS.includes(ext as (typeof DOCUMENT_EXTENSIONS)[number])) {
    throw new Error(`Unsupported file type "${ext}". Supported types: ${DOCUMENT_EXTENSIONS.join(", ")}`);
  }

  const fileStat = await stat(file);
  if (fileStat.size > DOCUMENT_MAX_SIZE_BYTES) {
    const sizeMB = Math.round(fileStat.size / (1024 * 1024));
    throw new Error(`File is ${sizeMB} MB, which exceeds the 100 MB limit.`);
  }

  const globals = cmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

  const { config } = await resolveConfig({
    profile: globals.profile,
    requiredScopes: ["openid", "profile", "email", "w_member_social"],
  });
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  const ownerUrn = await getCurrentPersonUrn(client);

  const data = new Uint8Array(await readFile(file));

  try {
    const documentUrn = await uploadDocument(client, {
      owner: ownerUrn,
      data,
    });

    const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
    const output = formatOutput({ urn: documentUrn }, format);
    console.log(output);
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to upload document: ${error.message}`);
    }
    throw error;
  }
}
