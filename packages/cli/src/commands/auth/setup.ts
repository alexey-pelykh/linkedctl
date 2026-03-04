// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { Command } from "commander";
import { saveOAuthClientCredentials, saveOAuthScope, saveOAuthPkce, saveApiVersion } from "@linkedctl/core";

import { DEFAULT_REDIRECT_PORT } from "./login.js";

export function setupCommand(): Command {
  const cmd = new Command("setup");
  cmd.description("Configure OAuth client credentials interactively");
  cmd.addHelpText("after", "\nLinkedIn Developer Portal: https://www.linkedin.com/developers/apps");

  cmd.action(async () => {
    const program = cmd.parent?.parent;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const profileFlag: string | undefined = program?.opts()["profile"];

    const rl = createInterface({ input: process.stdin, output: process.stderr });

    // Offer to save logo to ~/Downloads for easy upload during app registration
    const logoSource = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "assets", "logo.png");
    const logoDestination = join(homedir(), "Downloads", "linkedctl-logo.png");
    let logoSaved = false;
    const saveLogo = await rl.question("Save LinkedCtl logo to ~/Downloads for app registration? [y/N] ");
    if (saveLogo.trim().toLowerCase() === "y" || saveLogo.trim().toLowerCase() === "yes") {
      try {
        await copyFile(logoSource, logoDestination);
        logoSaved = true;
      } catch {
        process.stderr.write("  Could not save logo (file not available).\n");
      }
    }

    process.stderr.write("\n");
    process.stderr.write("To use OAuth authentication, you need a LinkedIn OAuth application.\n");
    process.stderr.write("\n");
    process.stderr.write('1. Go to https://www.linkedin.com/developers/apps and click "Create app"\n');
    process.stderr.write("2. Fill in the app details:\n");
    process.stderr.write('   - App name: "LinkedCtl - <your name>"\n');
    process.stderr.write("   - LinkedIn Page: select your company page (or personal default page)\n");
    if (logoSaved) {
      process.stderr.write(`   - App logo: use the file saved to ${logoDestination}\n`);
    } else {
      process.stderr.write("   - App logo: use the LinkedCtl logo from the repository (square, >= 100px)\n");
    }
    process.stderr.write('3. Under the "Auth" tab, note your Client ID and Primary Client Secret\n');
    process.stderr.write(`4. Add a redirect URL: http://127.0.0.1:${DEFAULT_REDIRECT_PORT}/callback\n`);
    process.stderr.write('5. Under "Products", request access to the products you need\n');
    process.stderr.write("   (e.g. Share on LinkedIn, Sign In with LinkedIn using OpenID Connect)\n");
    process.stderr.write("6. Copy the Client ID and Client Secret below\n");
    process.stderr.write("\n");

    try {
      const clientId = await rl.question("Client ID: ");
      if (clientId.trim() === "") {
        throw new Error("Client ID cannot be empty.");
      }

      const clientSecret = await rl.question("Client Secret: ");
      if (clientSecret.trim() === "") {
        throw new Error("Client Secret cannot be empty.");
      }

      const writeOpts = profileFlag !== undefined ? { profile: profileFlag } : undefined;

      await saveOAuthClientCredentials({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }, writeOpts);

      process.stderr.write("\n");
      process.stderr.write("Which LinkedIn products have you enabled for this app?\n");
      process.stderr.write("\n");

      const scopes: string[] = [];

      const signIn = await rl.question("Sign In with LinkedIn using OpenID Connect? [y/N] ");
      if (signIn.trim().toLowerCase() === "y" || signIn.trim().toLowerCase() === "yes") {
        scopes.push("openid", "profile", "email");
      }

      const share = await rl.question("Share on LinkedIn? [y/N] ");
      if (share.trim().toLowerCase() === "y" || share.trim().toLowerCase() === "yes") {
        scopes.push("w_member_social");
        // Posting requires the author's person URN, which is only available via
        // the /v2/userinfo endpoint. That endpoint needs openid scopes, so we
        // force-enable them when Share on LinkedIn is selected.
        if (!scopes.includes("openid")) {
          scopes.push("openid", "profile", "email");
          process.stderr.write(
            '  → Also enabling "Sign In with LinkedIn" scopes (required to resolve author identity for posts)\n',
          );
        }
      }

      if (scopes.length === 0) {
        throw new Error("At least one LinkedIn product must be enabled for OAuth to work.");
      }

      const scope = [...new Set(scopes)].join(" ");
      await saveOAuthScope(scope, writeOpts);

      process.stderr.write("\n");
      process.stderr.write("PKCE (Proof Key for Code Exchange) improves security for native OAuth apps.\n");
      process.stderr.write("LinkedIn requires PKCE to be enabled for your app by LinkedIn support.\n");
      const pkceAnswer = await rl.question("Is PKCE enabled for your app? [y/N] ");
      const pkce = pkceAnswer.trim().toLowerCase() === "y" || pkceAnswer.trim().toLowerCase() === "yes";
      await saveOAuthPkce(pkce, writeOpts);
      await saveApiVersion("202501", writeOpts);

      if (profileFlag !== undefined) {
        process.stderr.write(`\nOAuth client credentials and scope saved to profile "${profileFlag}".\n`);
      } else {
        process.stderr.write("\nOAuth client credentials and scope saved.\n");
      }
      process.stderr.write(`Scope: ${scope}\n`);
      if (pkce) {
        process.stderr.write("PKCE: enabled\n");
      }
      process.stderr.write('Run "linkedctl auth login" to authenticate.\n');
    } finally {
      rl.close();
    }
  });

  return cmd;
}
