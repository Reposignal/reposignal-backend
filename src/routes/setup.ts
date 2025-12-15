/**
 * Public setup endpoints (no authentication required)
 * Validates installations with GitHub before responding
 */

import { Hono } from 'hono';
import { db } from '../db/client';
import { installations, repositories } from '../db/schema/index';
import { eq } from 'drizzle-orm';
import { validateInstallationWithGitHub } from '../auth/githubValidation';
import {
  ValidationError,
  ResourceNotFoundError,
  SetupAlreadyCompletedError,
  SetupWindowExpiredError,
  InstallationInvalidError,
  GitHubUnavailableError,
  isAppError,
} from '../utils/errors';

const setup = new Hono();

/**
 * GET /setup/context?installation_id=NUMBER
 * Returns setup context for the frontend
 *
 * Flow:
 * 1. Validate installation_id is numeric
 * 2. Query installation
 * 3. Check if setup already completed
 * 4. Check if setup window is still open
 * 5. Validate installation with GitHub (no cached results)
 * 6. Return setup context with repositories
 */
setup.get('/context', async (c) => {
  try {
    // Step 1: Validate installation_id is numeric
    const installationIdParam = c.req.query('installation_id');
    if (!installationIdParam) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'installation_id is required' } }, 400);
    }

    const installationId = parseInt(installationIdParam, 10);
    if (isNaN(installationId)) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'installation_id must be numeric' } }, 400);
    }

    // Step 2: Query installation
    const [installation] = await db
      .select()
      .from(installations)
      .where(eq(installations.githubInstallationId, installationId))
      .limit(1);

    if (!installation) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Installation not found' } }, 404);
    }

    // Step 3: Check if setup already completed
    if (installation.setupCompleted) {
      return c.json(
        { error: { code: 'SETUP_ALREADY_COMPLETED', message: 'Setup has already been completed' } },
        409
      );
    }

    // Step 4: Check if setup window is still open
    const now = new Date();
    if (!installation.setupAllowedUntil || now > installation.setupAllowedUntil) {
      return c.json(
        { error: { code: 'SETUP_WINDOW_EXPIRED', message: 'Setup window has expired' } },
        410
      );
    }

    // Step 5: Validate installation with GitHub (always fresh, never cached)
    try {
      await validateInstallationWithGitHub(installationId);
    } catch (error) {
      if (error instanceof InstallationInvalidError) {
        return c.json({ error: { code: 'INSTALLATION_INVALID', message: error.message } }, 403);
      }
      if (error instanceof GitHubUnavailableError) {
        return c.json({ error: { code: 'GITHUB_UNAVAILABLE', message: error.message } }, 502);
      }
      throw error;
    }

    // Step 6: Query repositories for this installation
    const repoList = await db
      .select({
        id: repositories.id,
        owner: repositories.owner,
        name: repositories.name,
        state: repositories.state,
      })
      .from(repositories)
      .where(eq(repositories.installationId, installation.id));

    // Return setup context
    return c.json({
      accountLogin: installation.accountLogin,
      repositories: repoList,
      setupExpiresAt: installation.setupAllowedUntil.toISOString(),
    });
  } catch (error) {
    console.error('Setup context error:', error);
    if (isAppError(error)) {
      return c.json({ error: error.toJSON().error }, error.statusCode as any);
    }
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      500
    );
  }
});

/**
 * POST /setup/complete
 * Completes the setup process by validating with GitHub and updating installation state
 *
 * Flow:
 * 1. Validate request body
 * 2. Query installation
 * 3. Check if setup already completed
 * 4. Check if setup window is still open
 * 5. Validate installation with GitHub
 * 6. Start transaction
 * 7. Update repositories with selected states
 * 8. Update settings on repositories
 * 9. Mark installation as completed
 * 10. Log setup completion
 * 11. Commit transaction
 */
setup.post('/complete', async (c) => {
  try {
    // Step 1: Validate request body
    const body = await c.req.json();

    if (!body.installation_id || typeof body.installation_id !== 'number') {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'installation_id must be numeric' } },
        400
      );
    }

    if (!Array.isArray(body.repositories)) {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'repositories must be an array' } },
        400
      );
    }

    if (!body.settings || typeof body.settings !== 'object') {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'settings object is required' } },
        400
      );
    }

    const { installation_id, repositories: repoUpdates, settings } = body;

    // Validate repository updates format
    for (const repo of repoUpdates) {
      if (!repo.repoId || typeof repo.repoId !== 'number') {
        return c.json(
          { error: { code: 'INVALID_INPUT', message: 'Each repository must have a numeric repoId' } },
          400
        );
      }
      if (!['off', 'public', 'paused'].includes(repo.state)) {
        return c.json(
          { error: { code: 'INVALID_INPUT', message: 'Repository state must be "off", "public", or "paused"' } },
          400
        );
      }
    }

    // Validate settings
    if (typeof settings.allowUnclassified !== 'boolean' ||
        typeof settings.allowClassification !== 'boolean' ||
        typeof settings.allowInference !== 'boolean' ||
        typeof settings.feedbackEnabled !== 'boolean') {
      return c.json(
        { error: { code: 'INVALID_INPUT', message: 'All settings must be boolean values' } },
        400
      );
    }

    // Step 2: Query installation
    const [installation] = await db
      .select()
      .from(installations)
      .where(eq(installations.githubInstallationId, installation_id))
      .limit(1);

    if (!installation) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Installation not found' } }, 404);
    }

    // Step 3: Check if setup already completed
    if (installation.setupCompleted) {
      return c.json(
        { error: { code: 'SETUP_ALREADY_COMPLETED', message: 'Setup has already been completed' } },
        409
      );
    }

    // Step 4: Check if setup window is still open
    const now = new Date();
    if (!installation.setupAllowedUntil || now > installation.setupAllowedUntil) {
      return c.json(
        { error: { code: 'SETUP_WINDOW_EXPIRED', message: 'Setup window has expired' } },
        410
      );
    }

    // Step 5: Validate installation with GitHub (always fresh)
    try {
      await validateInstallationWithGitHub(installation_id);
    } catch (error) {
      if (error instanceof InstallationInvalidError) {
        return c.json({ error: { code: 'INSTALLATION_INVALID', message: error.message } }, 403);
      }
      if (error instanceof GitHubUnavailableError) {
        return c.json({ error: { code: 'GITHUB_UNAVAILABLE', message: error.message } }, 502);
      }
      throw error;
    }

    // Step 6-11: Update repositories and installation (in transaction)
    // Note: Drizzle doesn't have explicit transaction control yet, so we'll use raw SQL if needed
    // For now, update repositories then installation
    for (const repoUpdate of repoUpdates) {
      await db
        .update(repositories)
        .set({
          state: repoUpdate.state,
          allowUnclassified: settings.allowUnclassified,
          allowClassification: settings.allowClassification,
          allowInference: settings.allowInference,
          feedbackEnabled: settings.feedbackEnabled,
          updatedAt: new Date(),
        })
        .where(eq(repositories.id, repoUpdate.repoId));
    }

    // Update installation as completed
    await db
      .update(installations)
      .set({
        setupCompleted: true,
        setupAllowedUntil: null,
      })
      .where(eq(installations.id, installation.id));

    // Log setup completion
    const { writeLog } = await import('../modules/logs/writer');
    await writeLog({
      actor: { type: 'system' },
      action: 'installation_setup_completed',
      entityType: 'installation',
      entityId: `installation:${installation_id}`,
      context: { account_login: installation.accountLogin },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Setup complete error:', error);
    if (isAppError(error)) {
      return c.json({ error: error.toJSON().error }, error.statusCode as any);
    }
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      500
    );
  }
});

export default setup;
