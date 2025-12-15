import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'jsonwebtoken';
import { ActorType } from '../utils/enums';

export type UserActor = {
  type: typeof ActorType.USER;
  githubId: number;
  username: string;
};

export type SessionPayload = {
  githubId: number;
  username: string;
};

export async function userAuth(c: Context, next: Next) {
  const token = getCookie(c, 'session');

  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  try {
    const payload = verify(token, secret) as SessionPayload;

    // Set user actor
    c.set('actor', {
      type: ActorType.USER,
      githubId: payload.githubId,
      username: payload.username,
    } as UserActor);

    await next();
  } catch (error) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }
}
