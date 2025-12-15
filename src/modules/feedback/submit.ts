import { db } from '../../db/client';
import { feedbackEvents, repositoryFeedbackAggregates, repositories } from '../../db/schema/index';
import { writeLog } from '../logs/writer';
import { eq, avg, count } from 'drizzle-orm';

export type FeedbackSubmission = {
  githubRepoId: number;
  githubPrId: number;
  difficultyRating?: number | null;
  responsivenessRating?: number | null;
};

export async function submitFeedback(data: FeedbackSubmission) {
  const { githubRepoId, githubPrId, difficultyRating, responsivenessRating } = data;

  // Get repository
  const [repo] = await db
    .select()
    .from(repositories)
    .where(eq(repositories.githubRepoId, githubRepoId))
    .limit(1);

  if (!repo) {
    throw new Error(`Repository not found: ${githubRepoId}`);
  }

  // Insert feedback event (anonymous by design)
  await db.insert(feedbackEvents).values({
    repoId: repo.id,
    githubPrId,
    difficultyRating: difficultyRating ?? null,
    responsivenessRating: responsivenessRating ?? null,
  });

  // Update aggregates
  await updateFeedbackAggregates(repo.id);

  // Log feedback submission
  await writeLog({
    actor: { type: 'user', githubId: null, username: null },
    action: 'feedback_received',
    entityType: 'repository',
    entityId: `repo:${repo.owner}/${repo.name}`,
    context: { difficulty_rating: difficultyRating ?? null, responsiveness_rating: responsivenessRating ?? null },
  });
}

async function updateFeedbackAggregates(repoId: number) {
  // Calculate aggregates from feedback events
  const result = await db
    .select({
      avgDifficulty: avg(feedbackEvents.difficultyRating),
      avgResponsiveness: avg(feedbackEvents.responsivenessRating),
      feedbackCount: count(),
    })
    .from(feedbackEvents)
    .where(eq(feedbackEvents.repoId, repoId));

  const stats = result[0];

  if (!stats) {
    throw new Error('Failed to calculate feedback aggregates');
  }

  // Round to buckets (integers)
  const avgDifficultyBucket = stats.avgDifficulty ? Math.round(Number(stats.avgDifficulty)) : null;
  const avgResponsivenessBucket = stats.avgResponsiveness
    ? Math.round(Number(stats.avgResponsiveness))
    : null;

  // Upsert aggregates
  await db
    .insert(repositoryFeedbackAggregates)
    .values({
      repoId,
      avgDifficultyBucket,
      avgResponsivenessBucket,
      feedbackCount: Number(stats.feedbackCount),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: repositoryFeedbackAggregates.repoId,
      set: {
        avgDifficultyBucket,
        avgResponsivenessBucket,
        feedbackCount: Number(stats.feedbackCount),
        updatedAt: new Date(),
      },
    });
}
