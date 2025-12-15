import { db } from '../../db/client';
import {
  repositories,
  repositoryLanguages,
  repositoryFrameworks,
  repositoryDomains,
  repositoryTags,
  repositoryFeedbackAggregates,
} from '../../db/schema/index';
import { eq } from 'drizzle-orm';

export async function getRepositoryDetail(repoId: number) {
  // Get repository
  const [repo] = await db
    .select()
    .from(repositories)
    .where(eq(repositories.id, repoId))
    .limit(1);

  if (!repo) {
    return null;
  }

  // Get languages
  const languages = await db
    .select()
    .from(repositoryLanguages)
    .where(eq(repositoryLanguages.repoId, repoId));

  // Get frameworks
  const frameworks = await db
    .select()
    .from(repositoryFrameworks)
    .where(eq(repositoryFrameworks.repoId, repoId));

  // Get domains
  const domains = await db
    .select()
    .from(repositoryDomains)
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
    languages: languages.map((l) => ({ language: l.language, bytes: l.bytes })),
    frameworks: frameworks.map((f) => ({ framework: f.framework, source: f.source })),
    domains: domains.map((d) => d.domain),
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
