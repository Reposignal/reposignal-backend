import app from './app';
import { logger } from './utils/logger';
import { loadConfig } from './config';

// Load and validate configuration
try {
  loadConfig();
  logger.info('Configuration validated');
} catch (error) {
  logger.error(`Configuration error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const port = parseInt(process.env.PORT || '3000');

logger.info('Starting Reposignal Backend...');

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

logger.info(`Server running on http://localhost:${server.port}`);
