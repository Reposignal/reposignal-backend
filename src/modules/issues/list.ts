import { db } from '../../db/client';
import { repositories, issues } from '../../db/schema/index';
import { eq, and } from 'drizzle-orm';
import { ResourceNotFoundError } from '../../utils/errors';

/**
 * Public issues listing for a repository
 *
 * RULES (NON-NEGOTIABLE):
 * 1. Repository must exist and have state='public'
 * 2. Issue must NOT be hidden
 * 3. Only discoverable issues (enforced at SQL level)
 * 4. Paused repos show issues but they're not discoverable
 *
 * VISIBILITY ENFORCEMENT:
 * - state='public' → visible
 * - state='paused' → issues visible but NOT discoverable
 * - state='off' → nothing visible
 */

export interface RepositoryIssue {
  id: number;
  githubIssueId: number;
  difficulty: number | null;
  issueType: string | null;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get visible issues for a public or paused repository
 * Hidden issues are excluded at SQL level
 *
 * @throws ResourceNotFoundError if repository doesn't exist or is off
 */
export async function getRepositoryIssues(
  githubRepoId: number,
  options?: { limit?: number; offset?: number }
): Promise<RepositoryIssue[]> {
  const { limit = 50, offset = 0 } = options || {};

  // Fetch repository and enforce visibility
  const [repo] = await db
    .select({
      id: repositories.id,
      state: repositories.state,
    })
    .from(repositories)
    .where(eq(repositories.githubRepoId, githubRepoId))
    .limit(1);

  if (!repo) {
    throw new ResourceNotFoundError('Repository', githubRepoId.toString());
  }

  // Enforce visibility: state must be 'public' or 'paused' (off is not visible)
  if (repo.state === 'off') {
    throw new ResourceNotFoundError('Repository', githubRepoId.toString());
  }

  // Fetch non-hidden issues for this repository
  // Note: even if repo is paused, issues are visible (but not discoverable)
  const repoIssues = await db
    .select({
      id: issues.id,
      githubIssueId: issues.githubIssueId,
      difficulty: issues.difficulty,
      issueType: issues.issueType,
      hidden: issues.hidden,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .where(and(eq(issues.repoId, repo.id), eq(issues.hidden, false)))
    .limit(limit)
    .offset(offset);

  return repoIssues;
}
