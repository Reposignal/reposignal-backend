import { db } from '../../db/client';
import {
  repositories,
  repositoryLanguages,
  repositoryFrameworks,
  repositoryDomains,
  repositoryTags,
  repositoryFeedbackAggregates,
  languages as languagesTable,
  frameworks as frameworksTable,
  domains as domainsTable,
} from '../../db/schema/index';
import { eq } from 'drizzle-orm';

export async function getRepositoryDetail(repoId: number) {
  // Get repository
  const [repo] = await db
    .select()
    .from(repositories)
    .where(eq(repositories.githubRepoId, repoId))
    .limit(1);

  if (!repo) {
    return null;
  }

  // Get languages
  const languages = await db
    .select({
      id: repositoryLanguages.languageId,
      matchingName: languagesTable.matchingName,
      displayName: languagesTable.displayName,
    })
    .from(repositoryLanguages)
    .innerJoin(languagesTable, eq(repositoryLanguages.languageId, languagesTable.id))
    .where(eq(repositoryLanguages.repoId, repoId));

  // Get frameworks
  const frameworks = await db
    .select({
      id: repositoryFrameworks.frameworkId,
      matchingName: frameworksTable.matchingName,
      displayName: frameworksTable.displayName,
      source: repositoryFrameworks.source,
    })
    .from(repositoryFrameworks)
    .innerJoin(frameworksTable, eq(repositoryFrameworks.frameworkId, frameworksTable.id))
    .where(eq(repositoryFrameworks.repoId, repoId));

  // Get domains
  const domains = await db
    .select({
      id: repositoryDomains.domainId,
      matchingName: domainsTable.matchingName,
      displayName: domainsTable.displayName,
    })
    .from(repositoryDomains)
    .innerJoin(domainsTable, eq(repositoryDomains.domainId, domainsTable.id))
    .where(eq(repositoryDomains.repoId, repoId));

  // Get tags
  const tags = await db
    .select()
    .from(repositoryTags)
    .where(eq(repositoryTags.repoId, repoId));

  // Get feedback aggregates
  const [feedbackAgg] = await db
    .select()
    .from(repositoryFeedbackAggregates)
    .where(eq(repositoryFeedbackAggregates.repoId, repoId))
    .limit(1);

  return {
    ...repo,
    languages,
    frameworks,
    domains,
    tags: tags.map((t) => t.tag),
    feedback: feedbackAgg
      ? {
          avgDifficultyBucket: feedbackAgg.avgDifficultyBucket,
          avgResponsivenessBucket: feedbackAgg.avgResponsivenessBucket,
          feedbackCount: feedbackAgg.feedbackCount,
        }
      : null,
  };
}
