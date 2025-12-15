import { db } from '../../db/client';
import { logs } from '../../db/schema/index';

export type ActorTypeStrict = 'system' | 'user' | 'bot';

export type LogActor =
  | { type: 'system' }
  | { type: 'bot' }
  | { type: 'user'; githubId: number | null; username: string | null };

export type EntityTypeStrict = 'installation' | 'repository' | 'issue' | 'user_profile';

export type LogEntry = {
  actor: LogActor;
  action: string;
  entityType: EntityTypeStrict;
  entityId: string;
  context?: Record<string, any> | null;
};

export async function writeLog(entry: LogEntry): Promise<void> {
  // No inference. Persist exactly what caller provides.
  const actorGithubId = entry.actor.type === 'user' ? entry.actor.githubId : null;
  const actorUsername = entry.actor.type === 'user' ? entry.actor.username : null;

  await db.insert(logs).values({
    actorType: entry.actor.type,
    actorGithubId,
    actorUsername,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    context: entry.context ?? null,
  });
}
