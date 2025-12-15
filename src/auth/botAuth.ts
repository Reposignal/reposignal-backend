import type { Context, Next } from 'hono';
import { ActorType } from '../utils/enums';

export type BotActor = {
  type: typeof ActorType.BOT;
};

export async function botAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  const expectedToken = process.env.BOT_API_KEY;

  if (!expectedToken || token !== expectedToken) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Set bot actor
  c.set('actor', { type: ActorType.BOT } as BotActor);

  await next();
}
