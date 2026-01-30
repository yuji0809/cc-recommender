terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  # GITHUB_TOKEN environment variable required
  owner = "yuji0809"
}

resource "github_branch_protection" "main" {
  repository_id = "cc-recommender"
  pattern       = "main"

  # Require pull requests
  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = false
    required_approving_review_count = 1
  }

  # Require status checks
  required_status_checks {
    strict   = true
    contexts = [
      "Code Quality / Type check",
      "Code Quality / Lint",
      "Code Quality / Security Audit",
      "Code Quality / Test with Coverage",
    ]
  }

  # Additional settings
  enforce_admins                  = false
  require_conversation_resolution = true
  required_linear_history         = false
  allows_force_pushes             = false
  allows_deletions                = false
}

# Output the settings
output "branch_protection_url" {
  value       = "https://github.com/yuji0809/cc-recommender/settings/branches"
  description = "URL to view branch protection settings"
}
