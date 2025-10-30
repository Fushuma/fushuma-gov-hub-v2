// Cookie configuration
export const COOKIE_NAME = 'fushuma_session';
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Application constants
export const APP_NAME = 'Fushuma Governance Hub';
export const APP_DESCRIPTION = 'The nexus for community interaction, governance, and economic activity';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Vote types
export const VOTE_TYPE = {
  FOR: 'for',
  AGAINST: 'against',
  ABSTAIN: 'abstain',
} as const;

// Status enums
export const PROPOSAL_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PASSED: 'passed',
  REJECTED: 'rejected',
  EXECUTED: 'executed',
} as const;

export const GRANT_STATUS = {
  SUBMITTED: 'submitted',
  REVIEW: 'review',
  APPROVED: 'approved',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export const LAUNCHPAD_STATUS = {
  SUBMITTED: 'submitted',
  REVIEW: 'review',
  VOTING: 'voting',
  APPROVED: 'approved',
  FUNDRAISING: 'fundraising',
  LAUNCHED: 'launched',
  REJECTED: 'rejected',
} as const;
