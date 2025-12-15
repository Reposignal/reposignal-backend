/**
 * GitHub App installation validation helper
 * Validates installations by requesting access tokens and checking access
 */

import jwt from 'jsonwebtoken';
import { getConfig } from '../config';
import { InstallationInvalidError, GitHubUnavailableError } from '../utils/errors';

/**
 * Generate GitHub App JWT for authentication
 * JWT authenticates the GitHub App itself, not an installation
 */
function generateAppJWT(): string {
  const config = getConfig();
  const now = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    {
      iat: now - 60, // 60 seconds in the past to account for clock skew
      exp: now + 9 * 60, // 9 minutes (GitHub requires < 10 minutes)
      iss: config.githubAppId,
    },
    config.githubAppPrivateKey,
    { algorithm: 'RS256' }
  );

  return token;
}

/**
 * Request an installation access token from GitHub
 * This proves the installation exists and is valid
 */
async function getInstallationAccessToken(githubInstallationId: number): Promise<string> {
  const config = getConfig();
  const appJWT = generateAppJWT();

  try {
    const response = await fetch(
      `https://api.github.com/app/installations/${githubInstallationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appJWT}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': config.githubAppName,
        },
      }
    );

    if (response.status === 201) {
      const data = (await response.json()) as { token: string };
      return data.token;
    }

    // 401, 403, 404 - installation is invalid or revoked
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new InstallationInvalidError(`Installation access token request failed with status ${response.status}`);
    }

    // Any other status - GitHub is having issues
    throw new GitHubUnavailableError(
      `GitHub API returned status ${response.status} when requesting installation token`
    );
  } catch (error) {
    // Network errors, timeout, etc.
    if (error instanceof InstallationInvalidError || error instanceof GitHubUnavailableError) {
      throw error;
    }
    throw new GitHubUnavailableError(`Failed to request installation token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate installation has access to repositories
 * This proves the installation is active and not revoked
 */
async function validateInstallationRepositoryAccess(installationToken: string): Promise<void> {
  const config = getConfig();

  try {
    const response = await fetch('https://api.github.com/installation/repositories', {
      headers: {
        Authorization: `Bearer ${installationToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': config.githubAppName,
      },
    });

    if (response.status === 200) {
      // Validation successful
      return;
    }

    // 401, 403, 404 - installation is revoked or invalid
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new InstallationInvalidError(`Installation repository access validation failed with status ${response.status}`);
    }

    // Any other status - GitHub is having issues
    throw new GitHubUnavailableError(
      `GitHub API returned status ${response.status} when validating installation access`
    );
  } catch (error) {
    // Network errors, timeout, etc.
    if (error instanceof InstallationInvalidError || error instanceof GitHubUnavailableError) {
      throw error;
    }
    throw new GitHubUnavailableError(`Failed to validate installation access: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate installation with GitHub
 * Steps:
 * 1. Generate app JWT
 * 2. Request installation access token
 * 3. Use token to validate installation has repository access
 *
 * Returns nothing on success.
 * Throws on failure.
 *
 * Never caches tokens or validation results.
 */
export async function validateInstallationWithGitHub(githubInstallationId: number): Promise<void> {
  // Step 1 & 2: Request installation access token
  const token = await getInstallationAccessToken(githubInstallationId);

  // Step 3: Validate installation has access to repositories
  await validateInstallationRepositoryAccess(token);

  // Token is intentionally discarded - never cached
}
