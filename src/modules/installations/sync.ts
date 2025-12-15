import { db } from '../../db/client';
import { installations, repositories } from '../../db/schema/index';
import { writeLog } from '../logs/writer';
import { eq } from 'drizzle-orm';
import { getConfig } from '../../config';

export type InstallationData = {
  githubInstallationId: number;
  accountType: 'user' | 'org';
  accountLogin: string;
  setupCompleted?: boolean;
};

export type RepositoryData = {
  githubRepoId: number;
  owner: string;
  name: string;
  state?: 'off' | 'public' | 'paused';
};

export async function syncInstallation(data: {
  installation: InstallationData;
  repositories?: RepositoryData[];
}) {
  const { installation: instData, repositories: repos = [] } = data;
  const config = getConfig();

  // Calculate setup window expiration
  const setupExpiresAt = new Date();
  setupExpiresAt.setMinutes(setupExpiresAt.getMinutes() + config.setupWindowMinutes);

  // Upsert installation
  const [installation] = await db
    .insert(installations)
    .values({
      githubInstallationId: instData.githubInstallationId,
      accountType: instData.accountType,
      accountLogin: instData.accountLogin,
      setupCompleted: instData.setupCompleted ?? false,
      setupAllowedUntil: setupExpiresAt,
    })
    .onConflictDoUpdate({
      target: installations.githubInstallationId,
      set: {
        accountLogin: instData.accountLogin,
        setupCompleted: instData.setupCompleted ?? false,
        setupAllowedUntil: setupExpiresAt,
      },
    })
    .returning();

  if (!installation) {
    throw new Error('Failed to sync installation');
  }

  // Log installation synced as bot
  await writeLog({
    actor: { type: 'bot' },
    action: 'installation_synced',
    entityType: 'installation',
    entityId: `installation:${instData.githubInstallationId}`,
    context: { account_login: instData.accountLogin },
  });

  // Sync repositories if provided
  for (const repoData of repos) {
    const [repo] = await db
      .insert(repositories)
      .values({
        installationId: installation.id,
        githubRepoId: repoData.githubRepoId,
        owner: repoData.owner,
        name: repoData.name,
        state: repoData.state ?? 'off',
      })
      .onConflictDoUpdate({
        target: repositories.githubRepoId,
        set: {
          owner: repoData.owner,
          name: repoData.name,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!repo) {
      throw new Error('Failed to sync repository');
    }

    await writeLog({
      actor: { type: 'system' },
      action: 'repository_created',
      entityType: 'repository',
      entityId: `repo:${repoData.owner}/${repoData.name}`,
      context: { github_repo_id: repoData.githubRepoId },
    });
  }

  return installation;
}
