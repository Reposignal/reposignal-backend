import { db } from '../../db/client';
import { logs } from '../../db/schema/index';
import { desc, eq } from 'drizzle-orm';

export type LogsQuery = {
  repoId?: string;
  limit?: number;
  offset?: number;
};

export async function getLogs(query: LogsQuery = {}) {
  const { limit = 50, offset = 0, repoId } = query;

  let q = db.select().from(logs).$dynamic();

  if (repoId) {
    q = q.where(eq(logs.entityId, repoId));
  }

  const results = await q
    .orderBy(desc(logs.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}
