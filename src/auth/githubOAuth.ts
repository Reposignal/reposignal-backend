import { sign } from 'jsonwebtoken';
import type { SessionPayload } from './userAuth';

type GitHubUser = {
  id: number;
  login: string;
  avatar_url: string;
  bio?: string | null;
};

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error('Failed to exchange code for token');
  }

  return data.access_token;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }

  return await response.json() as GitHubUser;
}

export function createSession(githubId: number, username: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET not configured');
  }

  const payload: SessionPayload = {
    githubId,
    username,
  };

  return sign(payload, secret, { expiresIn: '30d' });
}

export function getGitHubLoginUrl(): string {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    throw new Error('GitHub OAuth not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user repo',
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
