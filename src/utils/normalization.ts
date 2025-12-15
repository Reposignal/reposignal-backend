export function normalizeMatchingName(input: string): string {
  // Lowercase, remove non-alphanumeric, remove spaces/punctuation
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

import { db } from '../db/client';
import { languages, frameworks, domains } from '../db/schema/index';
import { eq } from 'drizzle-orm';

export async function findLanguageByMatchingName(name: string) {
  const normalized = normalizeMatchingName(name);
  const rows = await db.select().from(languages).where(eq(languages.matchingName, normalized)).limit(1);
  return rows[0] ?? null;
}

export async function findFrameworkByMatchingName(name: string) {
  const normalized = normalizeMatchingName(name);
  const rows = await db.select().from(frameworks).where(eq(frameworks.matchingName, normalized)).limit(1);
  return rows[0] ?? null;
}

export async function findDomainByMatchingName(name: string) {
  const normalized = normalizeMatchingName(name);
  const rows = await db.select().from(domains).where(eq(domains.matchingName, normalized)).limit(1);
  return rows[0] ?? null;
}
