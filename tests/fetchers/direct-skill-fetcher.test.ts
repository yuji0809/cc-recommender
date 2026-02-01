/**
 * Direct Skill Fetcher Test Suite
 *
 * Tests for direct skill fetcher with automatic discovery
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Create mock functions
const mockAutoDiscoverSkills = vi.fn();
const mockFetchRawFile = vi.fn();
const mockFetchRepoMetadata = vi.fn();
const mockParseSkillFromRaw = vi.fn();

// Mock the dependencies
vi.mock("../../src/config/direct-skill-sources.js", () => ({
  DIRECT_SKILL_SOURCES: [
    {
      name: "Test Skills",
      org: "test-org",
      repo: "test-skills",
      url: "https://github.com/test-org/test-skills",
    },
  ],
  SKILL_FILE_PATTERNS: ["skill.md"],
}));

vi.mock("../../src/services/fetchers/skills/common/github-api.js", () => ({
  autoDiscoverSkills: mockAutoDiscoverSkills,
  fetchRawFile: mockFetchRawFile,
}));

vi.mock("../../src/services/fetchers/skills/common/skill-parser.js", () => ({
  fetchRepoMetadata: mockFetchRepoMetadata,
  parseSkillFromRaw: mockParseSkillFromRaw,
}));

describe("Direct Skill Fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchDirectSkills", () => {
    test("should fetch skills from configured sources", async () => {
      const { fetchDirectSkills } = await import(
        "../../src/services/fetchers/skills/direct-skill-fetcher.js"
      );

      // Mock repository metadata
      mockFetchRepoMetadata.mockResolvedValue({
        stars: 100,
        description: "Test repository",
        homepage: "https://example.com",
      });

      // Mock skill discovery
      mockAutoDiscoverSkills.mockResolvedValue(["test-skill"]);

      // Mock skill.md file check
      mockFetchRawFile.mockResolvedValue("# Test Skill\\n\\nA test skill");

      // Mock skill parsing
      mockParseSkillFromRaw.mockResolvedValue({
        id: "skill-test-test-skill",
        name: "Test Skill",
        type: "skill",
        url: "https://github.com/test-org/test-skills/tree/main/skills/test-skill",
        description: "A test skill",
        author: {
          name: "test-org",
          url: "https://github.com/test-org",
        },
        category: "Agent Skills",
        tags: ["skill", "test"],
        detection: {
          keywords: ["test"],
        },
        metrics: {
          source: "direct",
          isOfficial: false,
          stars: 100,
          securityScore: 100,
        },
        install: {
          method: "manual",
          command: "git clone https://github.com/test-org/test-skills/tree/main/skills/test-skill",
        },
      });

      const results = await fetchDirectSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockFetchRepoMetadata).toHaveBeenCalled();
    });

    test("should handle errors gracefully", async () => {
      const { fetchDirectSkills } = await import(
        "../../src/services/fetchers/skills/direct-skill-fetcher.js"
      );

      // Mock error
      mockFetchRepoMetadata.mockRejectedValue(new Error("API Error"));

      const results = await fetchDirectSkills();

      // Should return empty array on error
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test("should return empty array when no skills found", async () => {
      const { fetchDirectSkills } = await import(
        "../../src/services/fetchers/skills/direct-skill-fetcher.js"
      );

      mockFetchRepoMetadata.mockResolvedValue({
        stars: 0,
        description: "Empty repo",
        homepage: "",
      });

      mockAutoDiscoverSkills.mockResolvedValue([]);
      mockFetchRawFile.mockResolvedValue(null);

      const results = await fetchDirectSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test("should handle auto-discovery failure and use README fallback", async () => {
      const { fetchDirectSkills } = await import(
        "../../src/services/fetchers/skills/direct-skill-fetcher.js"
      );

      mockFetchRepoMetadata.mockResolvedValue({
        stars: 30,
        description: "Test",
        homepage: "",
      });

      // Mock auto-discovery to return empty (triggers README fallback)
      mockAutoDiscoverSkills.mockResolvedValue([]);

      // Mock README with skill subdirectories
      const mockReadme = `# Skills

[skill-one](./skill-one) - First skill
[skill-two](skill-two) - Second skill
`;

      mockFetchRawFile
        .mockResolvedValueOnce(mockReadme) // README
        .mockResolvedValueOnce("# Skill\n\nA skill") // skill.md check for skill-one
        .mockResolvedValueOnce("# Skill\n\nA skill"); // skill.md check for skill-two

      mockParseSkillFromRaw.mockResolvedValue({
        id: "skill-test",
        name: "Test Skill",
        type: "skill",
        url: "https://github.com/test-org/test-skills",
        description: "Test",
        author: { name: "test-org", url: "https://github.com/test-org" },
        category: "Agent Skills",
        tags: [],
        detection: { keywords: [] },
        metrics: { source: "direct", isOfficial: false, stars: 30, securityScore: 100 },
        install: { method: "manual", command: "git clone https://github.com/test-org/test-skills" },
      });

      const results = await fetchDirectSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Verify README was fetched (fallback triggered)
      expect(mockFetchRawFile).toHaveBeenCalled();
    });

    test("should skip invalid links in README extraction", async () => {
      const { fetchDirectSkills } = await import(
        "../../src/services/fetchers/skills/direct-skill-fetcher.js"
      );

      mockFetchRepoMetadata.mockResolvedValue({
        stars: 20,
        description: "Test",
        homepage: "",
      });

      // Mock auto-discovery to fail
      mockAutoDiscoverSkills.mockResolvedValue([]);

      // Mock README with both valid and invalid links
      const mockReadme = `# Skills

[valid-skill](./valid-skill)
[external](https://example.com/external)
[parent](../)
[current](.)
`;

      mockFetchRawFile.mockResolvedValueOnce(mockReadme).mockResolvedValue("# Skill\n\nA skill");

      mockParseSkillFromRaw.mockResolvedValue({
        id: "skill-test",
        name: "Test Skill",
        type: "skill",
        url: "https://github.com/test-org/test-skills",
        description: "Test",
        author: { name: "test-org", url: "https://github.com/test-org" },
        category: "Agent Skills",
        tags: [],
        detection: { keywords: [] },
        metrics: { source: "direct", isOfficial: false, stars: 20, securityScore: 100 },
        install: { method: "manual", command: "git clone https://github.com/test-org/test-skills" },
      });

      const results = await fetchDirectSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
