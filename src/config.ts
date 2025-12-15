/**
 * Application configuration from environment variables
 * Validates required variables on startup
 */

export interface AppConfig {
  githubAppId: number;
  githubAppPrivateKey: string;
  githubAppName: string;
  setupWindowMinutes: number;
}

export function loadConfig(): AppConfig {
  const requiredVars = ['GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_APP_NAME', 'SETUP_WINDOW_MINUTES'];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const githubAppId = parseInt(process.env.GITHUB_APP_ID!, 10);
  if (isNaN(githubAppId)) {
    throw new Error('GITHUB_APP_ID must be a numeric value');
  }

  const setupWindowMinutes = parseInt(process.env.SETUP_WINDOW_MINUTES!, 10);
  if (isNaN(setupWindowMinutes) || setupWindowMinutes <= 0) {
    throw new Error('SETUP_WINDOW_MINUTES must be a positive numeric value');
  }

  return {
    githubAppId,
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    githubAppName: process.env.GITHUB_APP_NAME!,
    setupWindowMinutes,
  };
}

let config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}
