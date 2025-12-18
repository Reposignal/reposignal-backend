import { db } from "../../db/client";
import {
  repositories,
  issues,
  repositoryLanguages,
  repositoryFrameworks,
  repositoryDomains,
  repositoryFeedbackAggregates,
  domains,
  frameworks,
  languages,
} from "../../db/schema/index";
import { eq, sql, desc, inArray } from "drizzle-orm";
import { normalizeMatchingName } from "../../utils/normalization";

export type DiscoveryFilters = {
  difficulty?: number | [number, number];
  domainIds?: number[];
  domainMatchingNames?: string[];
  frameworkIds?: number[];
  frameworkMatchingNames?: string[];
  languageIds?: number[];
  languageMatchingNames?: string[];
  includeUnclassified?: boolean;
  limit?: number;
  offset?: number;
};

export interface DiscoveryResult {
  score: number;
  issue: {
    githubIssueId: number;
    difficulty: number | null;
    issueType: string | null;
  };
  repository: {
    githubRepoId: number;
    owner: string;
    name: string;
    starsCount: number;
    forksCount: number;
    openIssuesCount: number;
    domains: Array<{ id: number; matchingName: string; displayName: string }>;
    frameworks: Array<{ id: number; matchingName: string; displayName: string; source: string }>;
    languages: Array<{ id: number; matchingName: string; displayName: string }>;
  };
  feedback: {
    avgDifficultyBucket: number | null;
    avgResponsivenessBucket: number | null;
  } | null;
}

export async function discoverRepositories(filters: DiscoveryFilters = {}) {
  const {
    difficulty,
    domainIds,
    domainMatchingNames,
    frameworkIds,
    frameworkMatchingNames,
    languageIds,
    languageMatchingNames,
    includeUnclassified = true,
    limit = 20,
    offset = 0,
  } = filters;

  let query = db
    .select({
      issueId: issues.id,
      githubIssueId: issues.githubIssueId,
      issueDifficulty: issues.difficulty,
      issueType: issues.issueType,
      repoId: repositories.id,
      githubRepoId: repositories.githubRepoId,
      owner: repositories.owner,
      name: repositories.name,
      starsCount: repositories.starsCount,
      forksCount: repositories.forksCount,
      openIssuesCount: repositories.openIssuesCount,
      allowUnclassified: repositories.allowUnclassified,
      avgDifficultyBucket: repositoryFeedbackAggregates.avgDifficultyBucket,
      avgResponsivenessBucket: repositoryFeedbackAggregates.avgResponsivenessBucket,
    })
    .from(issues)
    .innerJoin(repositories, eq(issues.repoId, repositories.id))
    .leftJoin(repositoryFeedbackAggregates, eq(repositories.id, repositoryFeedbackAggregates.repoId))
    .$dynamic();

  query = query.where(eq(repositories.state, "public"));
  query = query.where(eq(issues.hidden, false));
  
  if (includeUnclassified) {
    query = query.where(sql`${issues.difficulty} IS NOT NULL OR ${repositories.allowUnclassified} = true`);
  } else {
    query = query.where(sql`${issues.difficulty} IS NOT NULL`);
  }

  if (difficulty !== undefined) {
    if (Array.isArray(difficulty)) {
      const [min, max] = difficulty;
      query = query.where(sql`${issues.difficulty} IS NOT NULL AND ${issues.difficulty} BETWEEN ${min} AND ${max}`);
    } else {
      query = query.where(eq(issues.difficulty, difficulty));
    }
  }

  if ((domainIds && domainIds.length) || (domainMatchingNames && domainMatchingNames.length)) {
    let domainFilterIds: number[] = domainIds ? [...domainIds] : [];
    if (domainMatchingNames && domainMatchingNames.length) {
      const names = domainMatchingNames.map((n) => normalizeMatchingName(n));
      const rows = await db.select({ id: domains.id }).from(domains).where(inArray(domains.matchingName, names));
      domainFilterIds.push(...rows.map((r) => r.id));
    }
    if (domainFilterIds.length) {
      const domainSubquery = db
        .select({ repoId: repositoryDomains.repoId })
        .from(repositoryDomains)
        .where(inArray(repositoryDomains.domainId, domainFilterIds));
      query = query.where(sql`${repositories.id} IN (${domainSubquery})`);
    }
  }

  if ((frameworkIds && frameworkIds.length) || (frameworkMatchingNames && frameworkMatchingNames.length)) {
    let frameworkFilterIds: number[] = frameworkIds ? [...frameworkIds] : [];
    if (frameworkMatchingNames && frameworkMatchingNames.length) {
      const names = frameworkMatchingNames.map((n) => normalizeMatchingName(n));
      const rows = await db.select({ id: frameworks.id }).from(frameworks).where(inArray(frameworks.matchingName, names));
      frameworkFilterIds.push(...rows.map((r) => r.id));
    }
    if (frameworkFilterIds.length) {
      const frameworkSubquery = db
        .select({ repoId: repositoryFrameworks.repoId })
        .from(repositoryFrameworks)
        .where(inArray(repositoryFrameworks.frameworkId, frameworkFilterIds));
      query = query.where(sql`${repositories.id} IN (${frameworkSubquery})`);
    }
  }

  if ((languageIds && languageIds.length) || (languageMatchingNames && languageMatchingNames.length)) {
    let languageFilterIds: number[] = languageIds ? [...languageIds] : [];
    if (languageMatchingNames && languageMatchingNames.length) {
      const names = languageMatchingNames.map((n) => normalizeMatchingName(n));
      const rows = await db.select({ id: languages.id }).from(languages).where(inArray(languages.matchingName, names));
      languageFilterIds.push(...rows.map((r) => r.id));
    }
    if (languageFilterIds.length) {
      const languageSubquery = db
        .select({ repoId: repositoryLanguages.repoId })
        .from(repositoryLanguages)
        .where(inArray(repositoryLanguages.languageId, languageFilterIds));
      query = query.where(sql`${repositories.id} IN (${languageSubquery})`);
    }
  }

  const results = await query.orderBy(desc(issues.githubIssueId)).limit(limit).offset(offset);
  const repoIds = Array.from(new Set(results.map((r) => r.repoId)));

  const allDomains = repoIds.length
    ? await db
        .select({
          repoId: repositoryDomains.repoId,
          domainId: repositoryDomains.domainId,
          matchingName: domains.matchingName,
          displayName: domains.displayName,
        })
        .from(repositoryDomains)
        .innerJoin(domains, eq(repositoryDomains.domainId, domains.id))
        .where(inArray(repositoryDomains.repoId, repoIds))
    : [];
  const domainsByRepo = new Map<number, Array<{ id: number; matchingName: string; displayName: string }>>();
  allDomains.forEach((d) => {
    if (!domainsByRepo.has(d.repoId)) domainsByRepo.set(d.repoId, []);
    domainsByRepo.get(d.repoId)!.push({ id: d.domainId, matchingName: d.matchingName, displayName: d.displayName });
  });

  const allFrameworks = repoIds.length
    ? await db
        .select({
          repoId: repositoryFrameworks.repoId,
          frameworkId: repositoryFrameworks.frameworkId,
          source: repositoryFrameworks.source,
          matchingName: frameworks.matchingName,
          displayName: frameworks.displayName,
        })
        .from(repositoryFrameworks)
        .innerJoin(frameworks, eq(repositoryFrameworks.frameworkId, frameworks.id))
        .where(inArray(repositoryFrameworks.repoId, repoIds))
    : [];
  const frameworksByRepo = new Map<number, Array<{ id: number; matchingName: string; displayName: string; source: string }>>();
  allFrameworks.forEach((f) => {
    if (!frameworksByRepo.has(f.repoId)) frameworksByRepo.set(f.repoId, []);
    frameworksByRepo.get(f.repoId)!.push({ id: f.frameworkId, matchingName: f.matchingName, displayName: f.displayName, source: f.source });
  });

  const allLanguages = repoIds.length
    ? await db
        .select({
          repoId: repositoryLanguages.repoId,
          languageId: repositoryLanguages.languageId,
          matchingName: languages.matchingName,
          displayName: languages.displayName,
        })
        .from(repositoryLanguages)
        .innerJoin(languages, eq(repositoryLanguages.languageId, languages.id))
        .where(inArray(repositoryLanguages.repoId, repoIds))
    : [];
  const languagesByRepo = new Map<number, Array<{ id: number; matchingName: string; displayName: string }>>();
  allLanguages.forEach((l) => {
    if (!languagesByRepo.has(l.repoId)) languagesByRepo.set(l.repoId, []);
    languagesByRepo.get(l.repoId)!.push({ id: l.languageId, matchingName: l.matchingName, displayName: l.displayName });
  });

  const enrichedResults: DiscoveryResult[] = results.map((row) => {
    let score = 100;

    if (difficulty !== undefined && row.issueDifficulty !== null) {
      const targetDifficulty = Array.isArray(difficulty) ? difficulty[0] : difficulty;
      const diff = Math.abs(targetDifficulty - row.issueDifficulty);
      if (diff === 0) score += 50;
      else if (diff === 1) score += 30;
      else if (diff === 2) score += 10;
    }

    if ((domainIds && domainIds.length) || (domainMatchingNames && domainMatchingNames.length)) {
      const domainList = domainsByRepo.get(row.repoId) || [];
      const ids = domainIds || [];
      const names = (domainMatchingNames || []).map((n) => normalizeMatchingName(n));
      if (domainList.some((d) => ids.includes(d.id) || names.includes(d.matchingName))) score += 20;
    }

    if ((frameworkIds && frameworkIds.length) || (frameworkMatchingNames && frameworkMatchingNames.length)) {
      const frameworkList = frameworksByRepo.get(row.repoId) || [];
      const ids = frameworkIds || [];
      const names = (frameworkMatchingNames || []).map((n) => normalizeMatchingName(n));
      if (frameworkList.some((f) => ids.includes(f.id) || names.includes(f.matchingName))) score += 15;
    }

    if ((languageIds && languageIds.length) || (languageMatchingNames && languageMatchingNames.length)) {
      const languageList = languagesByRepo.get(row.repoId) || [];
      const ids = languageIds || [];
      const names = (languageMatchingNames || []).map((n) => normalizeMatchingName(n));
      if (languageList.some((l) => ids.includes(l.id) || names.includes(l.matchingName))) score += 10;
    }

    if (row.avgResponsivenessBucket !== null) score += Math.min(10, row.avgResponsivenessBucket * 2);
    score += Math.log10(row.starsCount + 1);
    score += Math.log10(row.forksCount + 1) * 0.5;
    if (row.openIssuesCount < 20) score += 1;

    return {
      score: Math.round(score * 100) / 100,
      issue: {
        githubIssueId: row.githubIssueId,
        difficulty: row.issueDifficulty,
        issueType: row.issueType,
      },
      repository: {
        githubRepoId: row.githubRepoId,
        owner: row.owner,
        name: row.name,
        starsCount: row.starsCount,
        forksCount: row.forksCount,
        openIssuesCount: row.openIssuesCount,
        domains: domainsByRepo.get(row.repoId) || [],
        frameworks: frameworksByRepo.get(row.repoId) || [],
        languages: languagesByRepo.get(row.repoId) || [],
      },
      feedback: row.avgDifficultyBucket || row.avgResponsivenessBucket
        ? {
            avgDifficultyBucket: row.avgDifficultyBucket,
            avgResponsivenessBucket: row.avgResponsivenessBucket,
          }
        : null,
    };
  });

  enrichedResults.sort((a, b) => b.score - a.score);
  return enrichedResults;
}
