import { db } from '../../db/client';
import { languages, frameworks, domains } from '../../db/schema/index';

export async function listLanguages() {
  const rows = await db.select().from(languages);
  return rows.map(r => ({ id: r.id, matchingName: r.matchingName, displayName: r.displayName }));
}

export async function listFrameworksGrouped() {
  const rows = await db.select().from(frameworks);
  const grouped: Record<string, Array<{ id: number; matchingName: string; displayName: string }>> = {};
  for (const r of rows) {
    const category = r.category ?? 'uncategorized';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ id: r.id, matchingName: r.matchingName, displayName: r.displayName });
  }
  return grouped;
}

export async function listDomains() {
  const rows = await db.select().from(domains);
  return rows.map(r => ({ id: r.id, matchingName: r.matchingName, displayName: r.displayName }));
}
