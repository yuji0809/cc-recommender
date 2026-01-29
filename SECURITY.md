# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of cc-recommender seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via GitHub's Security Advisory feature:

1. Go to the [Security Advisories](https://github.com/yuji0809/cc-recommender/security/advisories) page
2. Click "Report a vulnerability"
3. Fill out the form with details about the vulnerability

Alternatively, you can email the details to the repository owner.

### What to Include

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### Response Timeline

- We will acknowledge your report within 48 hours
- We will provide a more detailed response within 7 days
- We will work on a fix and release it as soon as possible
- We will notify you when the vulnerability is fixed

## Security Best Practices

When using cc-recommender:

1. **Keep Dependencies Updated**: Regularly update to the latest version to get security patches
2. **Review Recommendations**: Always review recommended tools before installing them
3. **Verify Sources**: Check the authenticity of plugins and MCP servers before use
4. **Use Official Sources**: Prefer official plugins and well-maintained projects
5. **Check Security Scores**: Pay attention to security scores in recommendations

## Disclosure Policy

When we receive a security report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported releases
4. Release new versions as soon as possible

## Comments

If you have suggestions on how this process could be improved, please submit a pull request.
