import { pgTable, bigserial, bigint, varchar, boolean, timestamp, text, integer, json } from 'drizzle-orm/pg-core';

// installations
export const installations = pgTable('installations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  githubInstallationId: bigint('github_installation_id', { mode: 'number' }).notNull().unique(),
  accountType: varchar('account_type', { length: 10, enum: ['user', 'org'] }).notNull(),
  accountLogin: varchar('account_login', { length: 255 }).notNull(),
  setupCompleted: boolean('setup_completed').notNull().default(false),
  setupAllowedUntil: timestamp('setup_allowed_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// repositories
export const repositories = pgTable('repositories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  installationId: bigint('installation_id', { mode: 'number' }).notNull().references(() => installations.id),
  githubRepoId: bigint('github_repo_id', { mode: 'number' }).notNull().unique(),
  owner: varchar('owner', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  state: varchar('state', { length: 10, enum: ['off', 'public', 'paused'] }).notNull().default('off'),
  allowUnclassified: boolean('allow_unclassified').notNull().default(false),
  allowClassification: boolean('allow_classification').notNull().default(false),
  allowInference: boolean('allow_inference').notNull().default(false),
  feedbackEnabled: boolean('feedback_enabled').notNull().default(false),
  reposignalDescription: text('reposignal_description'),
  starsCount: integer('stars_count').notNull().default(0),
  forksCount: integer('forks_count').notNull().default(0),
  openIssuesCount: integer('open_issues_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// canonical taxonomy tables
export const languages = pgTable('languages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  matchingName: varchar('matching_name', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const frameworks = pgTable('frameworks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  matchingName: varchar('matching_name', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const domains = pgTable('domains', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  matchingName: varchar('matching_name', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// repository_languages
export const repositoryLanguages = pgTable('repository_languages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repoId: bigint('repo_id', { mode: 'number' }).notNull().references(() => repositories.id),
  languageId: bigint('language_id', { mode: 'number' }).notNull().references(() => languages.id),
  bytes: bigint('bytes', { mode: 'number' }).notNull(),
});

// repository_frameworks
export const repositoryFrameworks = pgTable('repository_frameworks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repoId: bigint('repo_id', { mode: 'number' }).notNull().references(() => repositories.id),
  frameworkId: bigint('framework_id', { mode: 'number' }).notNull().references(() => frameworks.id),
  source: varchar('source', { length: 20, enum: ['inferred', 'maintainer'] }).notNull(),
});

// repository_domains
export const repositoryDomains = pgTable('repository_domains', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repoId: bigint('repo_id', { mode: 'number' }).notNull().references(() => repositories.id),
  domainId: bigint('domain_id', { mode: 'number' }).notNull().references(() => domains.id),
});

// repository_tags
export const repositoryTags = pgTable('repository_tags', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repoId: bigint('repo_id', { mode: 'number' }).notNull().references(() => repositories.id),
  tag: varchar('tag', { length: 100 }).notNull(),
});

// issues
export const issues = pgTable('issues', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repoId: bigint('repo_id', { mode: 'number' }).notNull().references(() => repositories.id),
  githubIssueId: bigint('github_issue_id', { mode: 'number' }).notNull().unique(),
  difficulty: integer('difficulty'), // nullable, 1-5
  issueType: varchar('issue_type', { length: 20, enum: ['docs', 'bug', 'feature', 'refactor', 'test', 'infra'] }), // nullable
  hidden: boolean('hidden').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// feedback_events (PRIVATE)
export const feedbackEvents = pgTable('feedback_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repoId: bigint('repo_id', { mode: 'number' }).notNull().references(() => repositories.id),
  githubPrId: bigint('github_pr_id', { mode: 'number' }).notNull(),
  difficultyRating: integer('difficulty_rating'), // nullable
  responsivenessRating: integer('responsiveness_rating'), // nullable
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// repository_feedback_aggregates
export const repositoryFeedbackAggregates = pgTable('repository_feedback_aggregates', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repoId: bigint('repo_id', { mode: 'number' }).notNull().unique().references(() => repositories.id),
  avgDifficultyBucket: integer('avg_difficulty_bucket'),
  avgResponsivenessBucket: integer('avg_responsiveness_bucket'),
  feedbackCount: integer('feedback_count').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// users
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  githubUserId: bigint('github_user_id', { mode: 'number' }).notNull().unique(),
  username: varchar('username', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  links: json('links'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// logs (IMMUTABLE)
export const logs = pgTable('logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorType: varchar('actor_type', { length: 10, enum: ['system', 'user', 'bot'] }).notNull(),
  actorGithubId: bigint('actor_github_id', { mode: 'number' }),
  actorUsername: varchar('actor_username', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  context: json('context'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
