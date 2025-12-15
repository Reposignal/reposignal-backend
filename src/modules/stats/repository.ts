import { db } from '../../db/client';
import { issues, feedbackEvents } from '../../db/schema/index';
import { eq, count, avg } from 'drizzle-orm';

export async function getRepositoryStats(repoId: number) {
  // Get issue counts
  const issueStats = await db
    .select({
      total: count(),
    })
    .from(issues)
    .where(eq(issues.repoId, repoId));

  // Get issue counts by difficulty
  const difficultyStats = await db
    .select({
      difficulty: issues.difficulty,
      count: count(),
    })
    .from(issues)
    .where(eq(issues.repoId, repoId))
    .groupBy(issues.difficulty);

  // Get issue counts by type
  const typeStats = await db
    .select({
      issueType: issues.issueType,
      count: count(),
    })
    .from(issues)
    .where(eq(issues.repoId, repoId))
    .groupBy(issues.issueType);

  // Get feedback stats
  const feedbackStats = await db
    .select({
      count: count(),
      avgDifficulty: avg(feedbackEvents.difficultyRating),
      avgResponsiveness: avg(feedbackEvents.responsivenessRating),
    })
    .from(feedbackEvents)
    .where(eq(feedbackEvents.repoId, repoId));

  return {
    issues: {
      total: issueStats[0]?.total || 0,
      byDifficulty: difficultyStats.reduce((acc, stat) => {
        if (stat.difficulty !== null) {
          acc[stat.difficulty] = Number(stat.count);
        }
        return acc;
      }, {} as Record<number, number>),
      byType: typeStats.reduce((acc, stat) => {
        if (stat.issueType !== null) {
          acc[stat.issueType] = Number(stat.count);
        }
        return acc;
      }, {} as Record<string, number>),
    },
    feedback: {
      count: Number(feedbackStats[0]?.count) || 0,
      avgDifficulty: feedbackStats[0]?.avgDifficulty
        ? Number(feedbackStats[0].avgDifficulty)
        : null,
      avgResponsiveness: feedbackStats[0]?.avgResponsiveness
        ? Number(feedbackStats[0].avgResponsiveness)
        : null,
    },
  };
}
