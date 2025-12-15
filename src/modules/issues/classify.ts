import { db } from '../../db/client';
import { issues, repositories } from '../../db/schema/index';
import { writeLog } from '../logs/writer';
import { eq } from 'drizzle-orm';

export type IssueClassification = {
  githubIssueId: number;
  repoId: number;
  difficulty?: number | null;
  issueType?: 'docs' | 'bug' | 'feature' | 'refactor' | 'test' | 'infra' | null;
  hidden?: boolean;
  actor: { type: 'user'; githubId: number; username: string };
};

export async function classifyIssue(data: IssueClassification) {
  const { githubIssueId, repoId, difficulty, issueType, hidden, actor } = data;

  // Check if issue exists
  const existing = await db
    .select()
    .from(issues)
    .where(eq(issues.githubIssueId, githubIssueId))
    .limit(1);

  let issue: typeof issues.$inferSelect | undefined;

  if (existing.length === 0) {
    // Create new issue
    [issue] = await db
      .insert(issues)
      .values({
        repoId,
        githubIssueId,
        difficulty: difficulty ?? null,
        issueType: issueType ?? null,
        hidden: hidden ?? false,
      })
      .returning();
  } else {
    // Update existing issue - only update provided fields
    const updateData: any = { updatedAt: new Date() };
    
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (issueType !== undefined) updateData.issueType = issueType;
    if (hidden !== undefined) updateData.hidden = hidden;

    [issue] = await db
      .update(issues)
      .set(updateData)
      .where(eq(issues.githubIssueId, githubIssueId))
      .returning();
  }

  // Log classification
  if (!issue) {
    throw new Error('Failed to create or update issue');
  }

  const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoId)).limit(1);

  if (repo) {
    await writeLog({
      actor: { type: 'user', githubId: actor.githubId, username: actor.username },
      action: difficulty !== undefined ? 'issue_difficulty_set' : 'issue_classified',
      entityType: 'issue',
      entityId: `issue:${repo.owner}/${repo.name}#${githubIssueId}`,
      context: { difficulty, issueType, hidden },
    });
  }

  return issue;
}
