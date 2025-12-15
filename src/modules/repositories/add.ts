import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { repositories } from '../../db/schema/index';

export interface AddRepositoryPayload {
  installationId: number;
  githubRepoId: number;
  owner: string;
  name: string;
  state?: 'off' | 'public' | 'paused';
  starsCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
}

export async function addRepository(payload: AddRepositoryPayload) {
  const {
    installationId,
    githubRepoId,
    owner,
    name,
    state = 'off',
    starsCount = 0,
    forksCount = 0,
    openIssuesCount = 0,
  } = payload;

  // Check if repository already exists
  const existing = await db
    .select()
    .from(repositories)
    .where(eq(repositories.githubRepoId, githubRepoId))
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      error: 'Repository already exists',
      repository: existing[0],
    };
  }

  // Insert new repository
  const [repository] = await db
    .insert(repositories)
    .values({
      installationId,
      githubRepoId,
      owner,
      name,
      state,
      starsCount,
      forksCount,
      openIssuesCount,
    })
    .returning();

  return {
    success: true,
    repository,
  };
}
