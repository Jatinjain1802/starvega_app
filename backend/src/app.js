import express from 'express';
import helmet from 'helmet';

export function createApp({ db }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/v1/ready', async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  app.use((err, _req, res, _next) => {
    const status = err.status === 400 || err.status === 413 ? err.status : 500;
    if (status === 500) console.error('Unexpected request error');
    res.status(status).json({ error: status === 400 ? 'BAD_REQUEST' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR' });
  });
  return app;
}
