import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { UserActor } from './userAuth';

export async function checkRepoPermission(c: Context, next: Next) {
  const actor = c.get('actor') as UserActor;

  if (!actor || actor.type !== 'user') {
    return c.json({ error: 'User authentication required' }, 401);
  }

  // Get session token to make GitHub API calls
  const token = getCookie(c, 'session');
  if (!token) {
    return c.json({ error: 'Session token required' }, 401);
  }

  // Store the session token for later use in checking permissions
  c.set('githubToken', token);

  await next();
}

export async function verifyRepoAccess(
  repoOwner: string,
  repoName: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const repo = await response.json() as { permissions?: { admin?: boolean; push?: boolean } };
    return repo.permissions?.admin || repo.permissions?.push || false;
  } catch {
    return false;
  }
}
