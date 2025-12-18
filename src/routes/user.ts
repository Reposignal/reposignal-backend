import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { userAuth, type UserActor } from '../auth/userAuth';
import { updateProfile } from '../modules/profiles/update';
import { updateRepositorySettings } from '../modules/repositories/updateSettings';
import { getLogs } from '../modules/logs/reader';
import { verifyRepoAccess } from '../auth/repoPermission';
import { db } from '../db/client';
import { repositories } from '../db/schema/index';
import { eq } from 'drizzle-orm';
import { ForbiddenError, ResourceNotFoundError } from '../utils/errors';

type Env = {
  Variables: {
    actor: UserActor;
  };
};

const user = new Hono<Env>();

// All user routes require user authentication
user.use('*', userAuth);

// POST /user/profile
user.post('/profile', async (c) => {
  try {
    const actor = c.get('actor') as UserActor;
    const body = await c.req.json();

    const result = await updateProfile({
      githubUserId: actor.githubId,
      username: actor.username,
      ...body,
    });

    return c.json(result);
  } catch (error: any) {
    console.error('Profile update error:', error);
    return c.json({ error: error.message || 'Failed to update profile' }, 500);
  }
});

// POST /user/repositories/:id/settings
user.post('/repositories/:id/settings', async (c) => {
  try {
    const actor = c.get('actor') as UserActor;
    const repoId = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Get repository from database
    const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoId)).limit(1);
    if (!repo) {
      throw new ResourceNotFoundError('Repository', repoId.toString());
    }

    // Verify user has permission to modify this repository
    const token = getCookie(c, 'session');
    if (!token) {
      throw new ForbiddenError('Session token required');
    }

    const hasAccess = await verifyRepoAccess(repo.owner, repo.name, token);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to modify this repository');
    }

    const result = await updateRepositorySettings(repoId, body, {
      githubId: actor.githubId,
      username: actor.username,
    });

    return c.json(result);
  } catch (error: any) {
    console.error('Repository settings update error:', error);
    return c.json({ error: error.message || 'Failed to update settings' }, 500);
  }
});

// GET /user/repositories/:id/logs
user.get('/repositories/:id/logs', async (c) => {
  try {
    const repoId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get repository from database
    const repoIdNum = parseInt(repoId);
    const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoIdNum)).limit(1);
    if (!repo) {
      throw new ResourceNotFoundError('Repository', repoId);
    }

    // Verify user has permission to view logs for this repository
    const token = getCookie(c, 'session');
    if (!token) {
      throw new ForbiddenError('Session token required');
    }

    const hasAccess = await verifyRepoAccess(repo.owner, repo.name, token);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to view logs for this repository');
    }

    const logs = await getLogs({ repoId, limit, offset });

    return c.json(logs);
  } catch (error: any) {
    console.error('Logs fetch error:', error);
    return c.json({ error: error.message || 'Failed to fetch logs' }, 500);
  }
});

export default user;
