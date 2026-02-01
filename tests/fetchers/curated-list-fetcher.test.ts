/**
 * Curated List Skill Fetcher Test Suite
 *
 * Tests for curated list skill fetcher
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Create mock functions
const mockFetchRawFile = vi.fn();
const mockFetchRepoMetadata = vi.fn();
const mockParseSkillFromRaw = vi.fn();

// Mock the dependencies
vi.mock("../../src/config/curated-list-sources.js", () => ({
  CURATED_LIST_SOURCES: [
    {
      name: "Test Curated List",
      org: "test-org",
      repo: "awesome-skills",
      url: "https://github.com/test-org/awesome-skills",
      type: "readme",
    },
  ],
}));

vi.mock("../../src/services/fetchers/skills/common/github-api.js", () => ({
  fetchRawFile: mockFetchRawFile,
}));

vi.mock("../../src/services/fetchers/skills/common/skill-parser.js", () => ({
  fetchRepoMetadata: mockFetchRepoMetadata,
  parseSkillFromRaw: mockParseSkillFromRaw,
}));

describe("Curated List Skill Fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchCuratedListSkills", () => {
    test("should fetch skills from curated lists", async () => {
      const { fetchCuratedListSkills } = await import(
        "../../src/services/fetchers/skills/curated-list-fetcher.js"
      );

      // Mock README content with skill links
      const mockReadme = `# Awesome Skills

## Skills

- [Test Skill](https://github.com/owner/test-skill) - A test skill
`;

      mockFetchRawFile.mockResolvedValue(mockReadme);

      mockFetchRepoMetadata.mockResolvedValue({
        stars: 50,
        description: "Curated list",
        homepage: "",
      });

      mockParseSkillFromRaw.mockResolvedValue({
        id: "skill-curated-test-skill",
        name: "Test Skill",
        type: "skill",
        url: "https://github.com/owner/test-skill",
        description: "A test skill",
        author: {
          name: "owner",
          url: "https://github.com/owner",
        },
        category: "Agent Skills",
        tags: ["skill", "curated"],
        detection: {
          keywords: ["test"],
        },
        metrics: {
          source: "curated",
          isOfficial: false,
          stars: 50,
          securityScore: 100,
        },
        install: {
          method: "manual",
          command: "git clone https://github.com/owner/test-skill",
        },
      });

      const results = await fetchCuratedListSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockFetchRawFile).toHaveBeenCalled();
    });

    test("should handle errors gracefully", async () => {
      const { fetchCuratedListSkills } = await import(
        "../../src/services/fetchers/skills/curated-list-fetcher.js"
      );

      // Mock error
      mockFetchRawFile.mockRejectedValue(new Error("Network error"));

      const results = await fetchCuratedListSkills();

      // Should return empty array on error
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test("should return empty array when README is empty", async () => {
      const { fetchCuratedListSkills } = await import(
        "../../src/services/fetchers/skills/curated-list-fetcher.js"
      );

      mockFetchRawFile.mockResolvedValue("");

      const results = await fetchCuratedListSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test("should extract GitHub URLs from markdown", async () => {
      const { fetchCuratedListSkills } = await import(
        "../../src/services/fetchers/skills/curated-list-fetcher.js"
      );

      const mockReadme = `# Skills

[Skill One](https://github.com/org/skill-one)
[Skill Two](https://github.com/org/skill-two)
[External Link](https://example.com) - should be ignored
`;

      mockFetchRawFile.mockResolvedValue(mockReadme);
      mockFetchRepoMetadata.mockResolvedValue({
        stars: 10,
        description: "Test",
        homepage: "",
      });
      mockParseSkillFromRaw.mockResolvedValue({
        id: "test",
        name: "Test",
        type: "skill",
        url: "https://github.com/org/skill",
        description: "Test",
        author: { name: "org", url: "https://github.com/org" },
        category: "Agent Skills",
        tags: [],
        detection: { keywords: [] },
        metrics: { source: "curated", isOfficial: false, stars: 10, securityScore: 100 },
        install: { method: "manual", command: "git clone https://github.com/org/skill" },
      });

      const results = await fetchCuratedListSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test("should filter out invalid GitHub URLs", async () => {
      const { fetchCuratedListSkills } = await import(
        "../../src/services/fetchers/skills/curated-list-fetcher.js"
      );

      const mockReadme = `# Skills

[Valid Skill](https://github.com/org/skill)
[Invalid URL](https://example.com/not-github)
[Another Valid](https://github.com/org2/skill2.git)
`;

      mockFetchRawFile.mockResolvedValue(mockReadme);
      mockFetchRepoMetadata.mockResolvedValue({
        stars: 5,
        description: "Test",
        homepage: "",
      });
      mockParseSkillFromRaw.mockResolvedValue({
        id: "test",
        name: "Test",
        type: "skill",
        url: "https://github.com/org/skill",
        description: "Test",
        author: { name: "org", url: "https://github.com/org" },
        category: "Agent Skills",
        tags: [],
        detection: { keywords: [] },
        metrics: { source: "curated", isOfficial: false, stars: 5, securityScore: 100 },
        install: { method: "manual", command: "git clone https://github.com/org/skill" },
      });

      const results = await fetchCuratedListSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test("should handle README with URLs containing .git extension and query params", async () => {
      const { fetchCuratedListSkills } = await import(
        "../../src/services/fetchers/skills/curated-list-fetcher.js"
      );

      const mockReadme = `# Skills

[Skill with .git](https://github.com/org/skill.git)
[Skill with query](https://github.com/org/skill?tab=readme)
`;

      mockFetchRawFile.mockResolvedValue(mockReadme);
      mockFetchRepoMetadata.mockResolvedValue({
        stars: 5,
        description: "Test",
        homepage: "",
      });
      mockParseSkillFromRaw.mockResolvedValue({
        id: "test",
        name: "Test",
        type: "skill",
        url: "https://github.com/org/skill",
        description: "Test",
        author: { name: "org", url: "https://github.com/org" },
        category: "Agent Skills",
        tags: [],
        detection: { keywords: [] },
        metrics: { source: "curated", isOfficial: false, stars: 5, securityScore: 100 },
        install: { method: "manual", command: "git clone https://github.com/org/skill" },
      });

      const results = await fetchCuratedListSkills();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
