import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import authRoutes from './routes/auth';
import botRoutes from './routes/bot';
import userRoutes from './routes/user';
import publicRoutes from './routes/public';
import metaRoutes from './routes/meta';
import setupRoutes from './routes/setup';
import { errorHandler } from './utils/errorHandler';
import { openAPISpec } from './utils/openapi';
import { serveSwaggerUI } from './utils/swaggerUI';

const app = new Hono();

// Middleware
app.use('*', honoLogger());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAPI / Swagger documentation
app.get('/openapi.json', (c) => {
  return c.json(openAPISpec);
});

app.get('/documentation', serveSwaggerUI('/openapi.json'));

// Routes
app.route('/auth', authRoutes);
app.route('/bot', botRoutes);
app.route('/user', userRoutes);
app.route('/public', publicRoutes);
app.route('/meta', metaRoutes);
app.route('/setup', setupRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  return errorHandler(err, c);
});

export default app;
