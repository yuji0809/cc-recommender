/**
 * GitHub URL Utility
 *
 * Checks whether a URL points to github.com by parsing it,
 * instead of substring matching (which allows host confusion such as
 * "https://github.com.evil.example/...").
 */

/**
 * URL が https の github.com を指しているか判定する
 *
 * @param url - 判定する URL
 * @returns ホスト名が厳密に github.com かつ https の場合 true
 */
export function isGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "github.com";
  } catch {
    return false;
  }
}
