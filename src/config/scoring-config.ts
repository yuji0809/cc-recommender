/**
 * Scoring Configuration
 *
 * Weights and multipliers for recommendation scoring algorithm
 */

/** Score weights for different match types */
export const SCORING_WEIGHTS = {
  language: 5, // Language match is very important
  framework: 4, // Framework match is important
  dependency: 3, // Direct dependency match
  file: 2, // File pattern match
  keyword: 1, // Keyword/tag match
} as const;

/** Score multipliers for quality indicators */
export const SCORING_MULTIPLIERS = {
  official: 1.3, // Official items get a boost
  highSecurity: 1.1, // Security score > 80
  lowSecurity: 0.7, // Security score < 50
} as const;

/** Scoring thresholds */
export const SCORING_THRESHOLDS = {
  minScore: 1,
  maxResults: 20,
  highSecurityThreshold: 80,
  lowSecurityThreshold: 50,
  /** Expected maximum raw score for normalization (empirical value) */
  maxRawScore: 50,
} as const;
