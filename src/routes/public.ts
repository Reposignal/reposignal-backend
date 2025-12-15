import { Hono } from 'hono';
import { getRepositoryIssues } from '../modules/issues/list';
import { getRepositoryDetail } from '../modules/repositories/detail';
import { discoverRepositories } from '../modules/discovery/search';
import { getRepositoryStats } from '../modules/stats/repository';

const publicRoutes = new Hono();

// GET /public/repositories/:id/issues
publicRoutes.get('/repositories/:id/issues', async (c) => {
  try {
    const repoId = parseInt(c.req.param('id'));
    const issues = await getRepositoryIssues(repoId);
    return c.json(issues);
  } catch (error: any) {
    console.error('Issues fetch error:', error);
    return c.json({ error: error.message || 'Failed to fetch issues' }, 500);
  }
});

// GET /public/repositories/:id
publicRoutes.get('/repositories/:id', async (c) => {
  try {
    const repoId = parseInt(c.req.param('id'));
    const repo = await getRepositoryDetail(repoId);

    if (!repo) {
      return c.json({ error: 'Repository not found' }, 404);
    }

    return c.json(repo);
  } catch (error: any) {
    console.error('Repository detail fetch error:', error);
    return c.json({ error: error.message || 'Failed to fetch repository' }, 500);
  }
});

// GET /public/discovery
publicRoutes.get('/discovery', async (c) => {
  try {
    const filters = {
      language: c.req.query('language') ? c.req.query('language')!.split(',') : undefined,
      framework: c.req.query('framework') ? c.req.query('framework')!.split(',') : undefined,
      minStars: c.req.query('minStars') ? parseInt(c.req.query('minStars')!) : undefined,
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0,
    };

    const repos = await discoverRepositories(filters);
    return c.json(repos);
  } catch (error: any) {
    console.error('Discovery error:', error);
    return c.json({ error: error.message || 'Failed to discover repositories' }, 500);
  }
});

// GET /public/repositories/:id/stats
publicRoutes.get('/repositories/:id/stats', async (c) => {
  try {
    const repoId = parseInt(c.req.param('id'));
    const stats = await getRepositoryStats(repoId);
    return c.json(stats);
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    return c.json({ error: error.message || 'Failed to fetch stats' }, 500);
  }
});

export default publicRoutes;
