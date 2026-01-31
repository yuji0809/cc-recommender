/**
 * .env.example Parser
 *
 * Parses .env.example and similar template files to detect external services and APIs
 * Note: Only reads template files (.env.example, .env.template, .env.sample) for security
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Service detection mappings based on environment variable prefixes/patterns */
const SERVICE_PATTERNS: Array<{ pattern: RegExp; service: string }> = [
  { pattern: /^SUPABASE_/i, service: "supabase" },
  { pattern: /^OPENAI_/i, service: "openai" },
  { pattern: /^ANTHROPIC_/i, service: "anthropic" },
  { pattern: /^AWS_/i, service: "aws" },
  { pattern: /^AZURE_/i, service: "azure" },
  { pattern: /^GCP_/i, service: "gcp" },
  { pattern: /^GOOGLE_/i, service: "google-cloud" },
  { pattern: /^STRIPE_/i, service: "stripe" },
  { pattern: /^TWILIO_/i, service: "twilio" },
  { pattern: /^SENDGRID_/i, service: "sendgrid" },
  { pattern: /^FIREBASE_/i, service: "firebase" },
  { pattern: /^VERCEL_/i, service: "vercel" },
  { pattern: /^NETLIFY_/i, service: "netlify" },
  { pattern: /^CLOUDFLARE_/i, service: "cloudflare" },
  { pattern: /^GITHUB_/i, service: "github" },
  { pattern: /^GITLAB_/i, service: "gitlab" },
  { pattern: /^SLACK_/i, service: "slack" },
  { pattern: /^DISCORD_/i, service: "discord" },
  { pattern: /^DATABASE_URL/i, service: "database" },
  { pattern: /^POSTGRES/i, service: "postgresql" },
  { pattern: /^MYSQL/i, service: "mysql" },
  { pattern: /^MONGODB/i, service: "mongodb" },
  { pattern: /^REDIS_/i, service: "redis" },
  { pattern: /^ELASTICSEARCH_/i, service: "elasticsearch" },
  { pattern: /^ALGOLIA_/i, service: "algolia" },
  { pattern: /^SENTRY_/i, service: "sentry" },
  { pattern: /^DATADOG_/i, service: "datadog" },
  { pattern: /^NEW_RELIC_/i, service: "newrelic" },
  { pattern: /^MAILGUN_/i, service: "mailgun" },
  { pattern: /^POSTMARK_/i, service: "postmark" },
  { pattern: /^RESEND_/i, service: "resend" },
];

/**
 * Parse .env template files and detect external services
 * Only reads template files for security (no actual .env files with secrets)
 */
export async function parseDotenv(projectPath: string, info: ProjectInfo): Promise<void> {
  // Only check template files that don't contain secrets
  const envFiles = [".env.example", ".env.template", ".env.sample", ".env.dist"];

  for (const envFile of envFiles) {
    try {
      const envPath = join(projectPath, envFile);
      const content = await readFile(envPath, "utf-8");

      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

      for (const line of lines) {
        const match = line.match(/^([A-Z_][A-Z0-9_]*)/);
        if (match) {
          const envVar = match[1];

          // Check against service patterns
          for (const { pattern, service } of SERVICE_PATTERNS) {
            if (pattern.test(envVar)) {
              info.frameworks.push(service);
              break;
            }
          }
        }
      }
    } catch {
      // File doesn't exist, continue to next
    }
  }
}
