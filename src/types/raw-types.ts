/**
 * Raw Data Types
 *
 * Types for external data sources (marketplace, awesome lists, etc.)
 */

/** プラグインマーケットプレイスのエントリ (生データ) */
export type RawPluginEntry = {
  name: string;
  description: string;
  version?: string;
  author: {
    name: string;
    email?: string;
  };
  source: string | { url: string; subPath?: string };
  category: string;
  homepage?: string;
  tags?: string[];
  lspServers?: Record<string, unknown>;
};

/** awesome-mcp-servers のエントリ (パース後) */
export type RawMCPEntry = {
  owner: string;
  repo: string;
  url: string;
  description: string;
  language?: string;
  scope?: "cloud" | "local";
  platforms?: string[];
  isOfficial?: boolean;
  category: string;
};

/** awesome-claude-code CSV のエントリ */
export type RawSkillEntry = {
  name: string;
  url: string;
  author: string;
  authorUrl: string;
  license?: string;
  description: string;
  category: string;
};
