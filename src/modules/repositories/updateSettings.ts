import { db } from '../../db/client';
import { repositories } from '../../db/schema/index';
import { writeLog } from '../logs/writer';
import { eq } from 'drizzle-orm';

export type RepositorySettings = {
  reposignalDescription?: string | null;
  state?: 'off' | 'public' | 'paused';
  allowUnclassified?: boolean;
  allowClassification?: boolean;
  allowInference?: boolean;
  feedbackEnabled?: boolean;
};

export async function updateRepositorySettings(
  repoId: number,
  settings: RepositorySettings,
  actor: { githubId: number; username: string }
) {
  const updateData: any = { updatedAt: new Date() };

  if (settings.reposignalDescription !== undefined) {
    updateData.reposignalDescription = settings.reposignalDescription;
  }
  if (settings.state !== undefined) {
    updateData.state = settings.state;
  }
  if (settings.allowUnclassified !== undefined) {
    updateData.allowUnclassified = settings.allowUnclassified;
  }
  if (settings.allowClassification !== undefined) {
    updateData.allowClassification = settings.allowClassification;
  }
  if (settings.allowInference !== undefined) {
    updateData.allowInference = settings.allowInference;
  }
  if (settings.feedbackEnabled !== undefined) {
    updateData.feedbackEnabled = settings.feedbackEnabled;
  }

  const [repo] = await db
    .update(repositories)
    .set(updateData)
    .where(eq(repositories.id, repoId))
    .returning();

  if (!repo) {
    throw new Error(`Repository not found: ${repoId}`);
  }

  await writeLog({
    actor: { type: 'user', githubId: actor.githubId, username: actor.username },
    action: 'repository_settings_updated',
    entityType: 'repository',
    entityId: `repo:${repo.owner}/${repo.name}`,
    context: settings,
  });

  return repo;
}
