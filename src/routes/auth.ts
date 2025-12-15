import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { getGitHubLoginUrl, exchangeCodeForToken, fetchGitHubUser, createSession } from '../auth/githubOAuth';
import { updateProfile } from '../modules/profiles/update';

const auth = new Hono();

// GET /auth/github/login
auth.get('/github/login', (c) => {
  try {
    const loginUrl = getGitHubLoginUrl();
    return c.redirect(loginUrl);
  } catch (error) {
    return c.json({ error: 'Failed to initiate GitHub OAuth' }, 500);
  }
});

// GET /auth/github/callback
auth.get('/github/callback', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // Fetch GitHub user
    const githubUser = await fetchGitHubUser(accessToken);

    // Upsert user profile
    await updateProfile({
      githubUserId: githubUser.id,
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      bio: githubUser.bio,
    });

    // Create session
    const sessionToken = createSession(githubUser.id, githubUser.login);

    // Set cookie and redirect
    setCookie(c, 'session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return c.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// POST /auth/logout
auth.post('/logout', (c) => {
  setCookie(c, 'session', '', { maxAge: 0 });
  return c.json({ success: true });
});

export default auth;
