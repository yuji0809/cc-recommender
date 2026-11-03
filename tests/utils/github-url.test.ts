import { describe, expect, it } from "vitest";
import { isGitHubUrl } from "../../src/utils/github-url.js";

describe("isGitHubUrl", () => {
  describe("Normal Cases", () => {
    it("should accept a GitHub repository URL", () => {
      expect(isGitHubUrl("https://github.com/owner/repo")).toBe(true);
    });

    it("should accept a GitHub URL with a sub path", () => {
      expect(isGitHubUrl("https://github.com/owner/repo/tree/main/skills/foo")).toBe(true);
    });

    it("should accept an uppercase host (URL parsing normalizes it)", () => {
      expect(isGitHubUrl("https://GitHub.com/owner/repo")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should reject an empty string", () => {
      expect(isGitHubUrl("")).toBe(false);
    });

    it("should reject a string that is not a URL", () => {
      expect(isGitHubUrl("github.com/owner/repo")).toBe(false);
    });

    it("should reject non-https protocols", () => {
      expect(isGitHubUrl("http://github.com/owner/repo")).toBe(false);
      expect(isGitHubUrl("git://github.com/owner/repo")).toBe(false);
    });

    it("should reject GitHub subdomains", () => {
      expect(isGitHubUrl("https://gist.github.com/owner/abc")).toBe(false);
      expect(isGitHubUrl("https://raw.githubusercontent.com/owner/repo/main/x")).toBe(false);
    });
  });

  describe("Error Cases (host confusion)", () => {
    it("should reject hosts that merely contain github.com", () => {
      expect(isGitHubUrl("https://github.com.evil.example/owner/repo")).toBe(false);
      expect(isGitHubUrl("https://evilgithub.com/owner/repo")).toBe(false);
    });

    it("should reject github.com appearing only in the path or query", () => {
      expect(isGitHubUrl("https://evil.example/github.com/owner/repo")).toBe(false);
      expect(isGitHubUrl("https://evil.example/?next=https://github.com/owner/repo")).toBe(false);
    });

    it("should reject github.com appearing only in userinfo", () => {
      expect(isGitHubUrl("https://github.com@evil.example/owner/repo")).toBe(false);
    });
  });
});
