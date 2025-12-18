import { Hono } from 'hono';
import { botAuth } from '../auth/botAuth';
import { syncInstallation } from '../modules/installations/sync';
import { classifyIssue } from '../modules/issues/classify';
import { updateRepositoryMetadata, addDomains, deleteDomain, addTags, deleteTag } from '../modules/repositories/updateMetadata';
import { addRepository } from '../modules/repositories/add';
import { updateRepositorySettings } from '../modules/repositories/updateSettings';
import { submitFeedback } from '../modules/feedback/submit';
import { writeLog } from '../modules/logs/writer';
import { ActorType } from '../utils/enums';

const bot = new Hono();

// All bot routes require bot authentication
bot.use('*', botAuth);

// POST /bot/installations/sync
bot.post('/installations/sync', async (c) => {
  try {
    const body = await c.req.json();
    const result = await syncInstallation(body);
    return c.json(result);
  } catch (error: any) {
    console.error('Installation sync error:', error);
    return c.json({ error: error.message || 'Failed to sync installation' }, 500);
  }
});

// POST /bot/issues/classify
bot.post('/issues/classify', async (c) => {
  try {
    const body = await c.req.json();
    // Requires human intent: actor must be provided by bot service
    const result = await classifyIssue(body);
    return c.json(result);
  } catch (error: any) {
    console.error('Issue classification error:', error);
    return c.json({ error: error.message || 'Failed to classify issue' }, 500);
  }
});

// POST /bot/repositories/metadata
bot.post('/repositories/metadata', async (c) => {
  try {
    const body = await c.req.json();
    const result = await updateRepositoryMetadata(body);
    return c.json(result);
  } catch (error: any) {
    console.error('Metadata update error:', error);
    return c.json({ error: error.message || 'Failed to update metadata' }, 500);
  }
});

// POST /bot/repositories/add
bot.post('/repositories/add', async (c) => {
  try {
    const body = await c.req.json();
    const result = await addRepository(body);
    return c.json(result);
  } catch (error: any) {
    console.error('Add repository error:', error);
    return c.json({ error: error.message || 'Failed to add repository' }, 500);
  }
});

// POST /bot/repositories/:id/settings
bot.post('/repositories/:id/settings', async (c) => {
  try {
    const repoId = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const result = await updateRepositorySettings(repoId, body, {
      githubId: body.actor?.githubId || null,
      username: body.actor?.username || null,
    });

    return c.json(result);
  } catch (error: any) {
    console.error('Repository settings update error:', error);
    return c.json({ error: error.message || 'Failed to update settings' }, 500);
  }
});

// POST /bot/repositories/domains/add
bot.post('/repositories/domains/add', async (c) => {
  try {
    const body = await c.req.json();
    await addDomains(body.githubRepoId, body.owner, body.name, body.domains ?? [], body.actor);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Add domains error:', error);
    return c.json({ error: error.message || 'Failed to add domains' }, 400);
  }
});

// DELETE /bot/repositories/domains
bot.delete('/repositories/domains', async (c) => {
  try {
    const body = await c.req.json();
    await deleteDomain(body.githubRepoId, body.owner, body.name, body.domain, body.actor);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete domain error:', error);
    return c.json({ error: error.message || 'Failed to delete domain' }, 400);
  }
});

// POST /bot/repositories/tags/add
bot.post('/repositories/tags/add', async (c) => {
  try {
    const body = await c.req.json();
    await addTags(body.githubRepoId, body.owner, body.name, body.tags ?? [], body.actor);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Add tags error:', error);
    return c.json({ error: error.message || 'Failed to add tags' }, 400);
  }
});

// DELETE /bot/repositories/tags
bot.delete('/repositories/tags', async (c) => {
  try {
    const body = await c.req.json();
    await deleteTag(body.githubRepoId, body.owner, body.name, body.tag, body.actor);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete tag error:', error);
    return c.json({ error: error.message || 'Failed to delete tag' }, 400);
  }
});

// POST /bot/feedback
bot.post('/feedback', async (c) => {
  try {
    const body = await c.req.json();
    await submitFeedback(body);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Feedback submission error:', error);
    return c.json({ error: error.message || 'Failed to submit feedback' }, 500);
  }
});

// POST /bot/logs (optional - for bot cleanup logs)
bot.post('/logs', async (c) => {
  try {
    const body = await c.req.json();
    await writeLog({
      actor: { type: ActorType.BOT },
      action: body.action,
      entityType: body.entityType,
      entityId: body.entityId,
      context: body.context,
    });
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Log write error:', error);
    return c.json({ error: error.message || 'Failed to write log' }, 500);
  }
});

export default bot;
