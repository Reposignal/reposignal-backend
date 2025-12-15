// Account types
export const AccountType = {
  USER: 'user',
  ORG: 'org',
} as const;

export type AccountType = typeof AccountType[keyof typeof AccountType];

// Repository states
export const RepoState = {
  OFF: 'off',
  PUBLIC: 'public',
  PAUSED: 'paused',
} as const;

export type RepoState = typeof RepoState[keyof typeof RepoState];

// Issue types
export const IssueType = {
  DOCS: 'docs',
  BUG: 'bug',
  FEATURE: 'feature',
  REFACTOR: 'refactor',
  TEST: 'test',
  INFRA: 'infra',
} as const;

export type IssueType = typeof IssueType[keyof typeof IssueType];

// Framework sources
export const FrameworkSource = {
  INFERRED: 'inferred',
  MAINTAINER: 'maintainer',
} as const;

export type FrameworkSource = typeof FrameworkSource[keyof typeof FrameworkSource];

// Actor types
export const ActorType = {
  SYSTEM: 'system',
  USER: 'user',
  BOT: 'bot',
} as const;

export type ActorType = typeof ActorType[keyof typeof ActorType];

// Difficulty levels (1-5)
export const Difficulty = {
  VERY_EASY: 1,
  EASY: 2,
  MEDIUM: 3,
  HARD: 4,
  VERY_HARD: 5,
} as const;

export type Difficulty = typeof Difficulty[keyof typeof Difficulty];
