import { db } from '../../db/client';
import { repositories, repositoryLanguages, repositoryFrameworks, repositoryDomains, repositoryTags, languages as languagesTable, frameworks as frameworksTable, domains as domainsTable } from '../../db/schema/index';
import { writeLog } from '../logs/writer';
import { eq, and } from 'drizzle-orm';
import { ResourceNotFoundError, LimitExceededError, ValidationError } from '../../utils/errors';
import { normalizeMatchingName } from '../../utils/normalization';

export type RepositoryMetadata = {
  githubRepoId: number;
  languages?: Array<{ matchingName: string; bytes: number }>;
  frameworks?: Array<{ matchingName: string; source: 'inferred' | 'maintainer' }>;
  domains?: string[];
  tags?: string[];
  starsCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
  actor: { type: 'system' | 'bot' | 'user'; githubId?: number | null; username?: string | null };
};

export async function updateRepositoryMetadata(data: RepositoryMetadata) {
  const { githubRepoId, languages, frameworks, domains, tags, starsCount, forksCount, openIssuesCount, actor } = data;

  // Get repository
  const [repo] = await db
    .select()
    .from(repositories)
    .where(eq(repositories.githubRepoId, githubRepoId))
    .limit(1);

  if (!repo) {
    throw new ResourceNotFoundError('Repository', githubRepoId.toString());
  }

  // Update counts if provided
  const updateData: any = { updatedAt: new Date() };
  if (starsCount !== undefined) updateData.starsCount = starsCount;
  if (forksCount !== undefined) updateData.forksCount = forksCount;
  if (openIssuesCount !== undefined) updateData.openIssuesCount = openIssuesCount;

  await db
    .update(repositories)
    .set(updateData)
    .where(eq(repositories.id, repo.id));

  // Update languages (additive) if provided
  if (languages !== undefined && languages.length > 0) {
    const toInsert: Array<{ repoId: number; languageId: number; bytes: number }> = [];
    for (const lang of languages) {
      const norm = normalizeMatchingName(lang.matchingName);
      const [row] = await db.select().from(languagesTable).where(eq(languagesTable.matchingName, norm)).limit(1);
      if (!row) throw new ValidationError(`Unknown language: ${lang.matchingName}`);
      toInsert.push({ repoId: repo.id, languageId: row.id, bytes: lang.bytes });
    }
    if (toInsert.length) await db.insert(repositoryLanguages).values(toInsert);
  }

  // Update frameworks (additive) if provided, enforce max 3
  if (frameworks !== undefined && frameworks.length > 0) {
    const current = await db.select().from(repositoryFrameworks).where(eq(repositoryFrameworks.repoId, repo.id));
    const availableSlots = Math.max(0, 3 - current.length);
    if (availableSlots <= 0) throw new LimitExceededError('Frameworks', 3, current.length);

    const toInsert: Array<{ repoId: number; frameworkId: number; source: 'inferred' | 'maintainer' }> = [];
    for (const fw of frameworks.slice(0, availableSlots)) {
      const norm = normalizeMatchingName(fw.matchingName);
      const [row] = await db.select().from(frameworksTable).where(eq(frameworksTable.matchingName, norm)).limit(1);
      if (!row) throw new ValidationError(`Unknown framework: ${fw.matchingName}`);
      toInsert.push({ repoId: repo.id, frameworkId: row.id, source: fw.source });
    }
    if (toInsert.length) await db.insert(repositoryFrameworks).values(toInsert);
  }

  // Update domains (additive) if provided, enforce max 2
  if (domains !== undefined && domains.length > 0) {
    const existing = await db.select().from(repositoryDomains).where(eq(repositoryDomains.repoId, repo.id));
    const available = Math.max(0, 2 - existing.length);
    if (available <= 0) throw new LimitExceededError('Domains', 2, existing.length);

    const toInsert: Array<{ repoId: number; domainId: number }> = [];
    for (const d of domains.slice(0, available)) {
      const norm = normalizeMatchingName(d);
      const [row] = await db.select().from(domainsTable).where(eq(domainsTable.matchingName, norm)).limit(1);
      if (!row) throw new ValidationError(`Unknown domain: ${d}`);
      toInsert.push({ repoId: repo.id, domainId: row.id });
    }
    if (toInsert.length) await db.insert(repositoryDomains).values(toInsert);
  }

  // Update tags (additive) if provided, enforce max 5
  if (tags !== undefined && tags.length > 0) {
    const existing = await db.select().from(repositoryTags).where(eq(repositoryTags.repoId, repo.id));
    const available = Math.max(0, 5 - existing.length);

    if (available > 0) {
      const toInsert = tags.slice(0, available).map((t) => ({ repoId: repo.id, tag: t }));
      await db.insert(repositoryTags).values(toInsert);
    }
  }

  await writeLog({
    actor:
      actor.type === 'user'
        ? { type: 'user', githubId: actor.githubId ?? null, username: actor.username ?? null }
        : { type: actor.type },
    action: 'repository_metadata_updated',
    entityType: 'repository',
    entityId: `repo:${repo.owner}/${repo.name}`,
    context: { github_repo_id: githubRepoId },
  });

  return repo;
}

export async function addLanguages(
  githubRepoId: number,
  owner: string,
  name: string,
  languages: Array<{ matchingName: string; bytes: number }>,
  actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }
) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());

  const toInsert: Array<{ repoId: number; languageId: number; bytes: number }> = [];
  for (const lang of languages) {
    const norm = normalizeMatchingName(lang.matchingName);
    const [row] = await db.select().from(languagesTable).where(eq(languagesTable.matchingName, norm)).limit(1);
    if (!row) throw new ValidationError(`Unknown language: ${lang.matchingName}`);
    toInsert.push({ repoId: repo.id, languageId: row.id, bytes: lang.bytes });
  }

  if (toInsert.length) {
    await db.insert(repositoryLanguages).values(toInsert);
  }

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_languages_added',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { languages: languages.map((l) => normalizeMatchingName(l.matchingName)) },
  });
}

export async function deleteLanguage(
  githubRepoId: number,
  owner: string,
  name: string,
  matchingName: string,
  actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }
) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());
  const norm = normalizeMatchingName(matchingName);
  const [row] = await db.select().from(languagesTable).where(eq(languagesTable.matchingName, norm)).limit(1);
  if (!row) throw new ValidationError(`Unknown language: ${matchingName}`);
  await db.delete(repositoryLanguages).where(and(eq(repositoryLanguages.repoId, repo.id), eq(repositoryLanguages.languageId, row.id)));

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_language_deleted',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { language: norm },
  });
}

export async function addFrameworks(
  githubRepoId: number,
  owner: string,
  name: string,
  frameworks: Array<{ matchingName: string; source: 'inferred' | 'maintainer' }>,
  actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }
) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());

  const current = await db.select().from(repositoryFrameworks).where(eq(repositoryFrameworks.repoId, repo.id));
  const availableSlots = Math.max(0, 3 - current.length);

  if (availableSlots <= 0) throw new LimitExceededError('Frameworks', 3, current.length);

  const toInsert: Array<{ repoId: number; frameworkId: number; source: 'inferred' | 'maintainer' }> = [];
  for (const fw of frameworks.slice(0, availableSlots)) {
    const norm = normalizeMatchingName(fw.matchingName);
    const [row] = await db.select().from(frameworksTable).where(eq(frameworksTable.matchingName, norm)).limit(1);
    if (!row) throw new ValidationError(`Unknown framework: ${fw.matchingName}`);
    toInsert.push({ repoId: repo.id, frameworkId: row.id, source: fw.source });
  }

  if (toInsert.length) {
    await db.insert(repositoryFrameworks).values(toInsert);
  }

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_frameworks_added',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { frameworks: frameworks.map((f) => normalizeMatchingName(f.matchingName)) },
  });
}

export async function deleteFramework(
  githubRepoId: number,
  owner: string,
  name: string,
  matchingName: string,
  actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }
) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());
  const norm = normalizeMatchingName(matchingName);
  const [row] = await db.select().from(frameworksTable).where(eq(frameworksTable.matchingName, norm)).limit(1);
  if (!row) throw new ValidationError(`Unknown framework: ${matchingName}`);
  await db.delete(repositoryFrameworks).where(and(eq(repositoryFrameworks.repoId, repo.id), eq(repositoryFrameworks.frameworkId, row.id)));

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_framework_deleted',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { framework: norm },
  });
}

export async function addDomains(githubRepoId: number, owner: string, name: string, domainNames: string[], actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());

  const existing = await db.select().from(repositoryDomains).where(eq(repositoryDomains.repoId, repo.id));
  const available = Math.max(0, 2 - existing.length);
  if (available <= 0) throw new LimitExceededError('Domains', 2, existing.length);

  const toInsert: Array<{ repoId: number; domainId: number }> = [];
  for (const d of domainNames.slice(0, available)) {
    const norm = normalizeMatchingName(d);
    const [row] = await db.select().from(domainsTable).where(eq(domainsTable.matchingName, norm)).limit(1);
    if (!row) throw new ValidationError(`Unknown domain: ${d}`);
    toInsert.push({ repoId: repo.id, domainId: row.id });
  }
  if (toInsert.length) await db.insert(repositoryDomains).values(toInsert);

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_domains_added',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { domains: domainNames.map((d) => normalizeMatchingName(d)) },
  });
}

export async function deleteDomain(githubRepoId: number, owner: string, name: string, matchingName: string, actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());

  const norm = normalizeMatchingName(matchingName);
  const [row] = await db.select().from(domainsTable).where(eq(domainsTable.matchingName, norm)).limit(1);
  if (!row) throw new ValidationError(`Unknown domain: ${matchingName}`);
  await db.delete(repositoryDomains).where(and(eq(repositoryDomains.repoId, repo.id), eq(repositoryDomains.domainId, row.id)));

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_domain_deleted',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { domain: norm },
  });
}

export async function addTags(githubRepoId: number, owner: string, name: string, tags: string[], actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());

  const existing = await db.select().from(repositoryTags).where(eq(repositoryTags.repoId, repo.id));
  const available = Math.max(0, 5 - existing.length);
  if (available <= 0) throw new LimitExceededError('Tags', 5, existing.length);

  const toInsert = tags.slice(0, available).map((t) => ({ repoId: repo.id, tag: t }));
  if (toInsert.length) await db.insert(repositoryTags).values(toInsert);

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_tags_added',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { tags: toInsert.map((t) => t.tag) },
  });
}

export async function deleteTag(githubRepoId: number, owner: string, name: string, tag: string, actor: { type: 'user'; githubId: number; username: string } | { type: 'system' } | { type: 'bot' }) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.githubRepoId, githubRepoId)).limit(1);
  if (!repo) throw new ResourceNotFoundError('Repository', githubRepoId.toString());

  await db.delete(repositoryTags).where(and(eq(repositoryTags.repoId, repo.id), eq(repositoryTags.tag, tag)));

  await writeLog({
    actor: actor.type === 'user' ? { type: 'user', githubId: (actor as any).githubId, username: (actor as any).username } : { type: actor.type },
    action: 'repository_tag_deleted',
    entityType: 'repository',
    entityId: `repo:${owner}/${name}`,
    context: { tag },
  });
}
