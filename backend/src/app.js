import express from 'express';
import { createFinanceRouter } from './modules/properties/finance.js';
import { createNotificationRouter } from './modules/notifications/routes.js';
import { createPaymentRouter, paymentWebhook } from './modules/payments/routes.js';
import { createResidentRouter } from './modules/residents/routes.js';
import helmet from 'helmet';
import { createPropertyRouter } from './modules/properties/routes.js';
import { createAuthRouter } from './modules/auth/routes.js';

export function createApp({ db, jwtSecret }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  const paymentConfig={keyId:process.env.RAZORPAY_KEY_ID,keySecret:process.env.RAZORPAY_KEY_SECRET,webhookSecret:process.env.RAZORPAY_WEBHOOK_SECRET};
  app.post('/api/v1/payments/webhook',...paymentWebhook(db,paymentConfig));
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
  if (jwtSecret) app.use('/api/v1/notifications',createNotificationRouter(db,jwtSecret));
  if (jwtSecret) app.use('/api/v1/owner/finance',createFinanceRouter(db,jwtSecret));
  if (jwtSecret) app.use('/api/v1/auth', createAuthRouter(db, jwtSecret));
  if (jwtSecret) app.use('/api/v1/properties', createPropertyRouter(db, jwtSecret));
  if (jwtSecret) app.use('/api/v1/resident', createResidentRouter(db, jwtSecret));
  if(jwtSecret) app.use('/api/v1/payments',createPaymentRouter(db,jwtSecret,paymentConfig));
  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  app.use((err, _req, res, _next) => {
    const status = err.status === 400 || err.status === 413 ? err.status : 500;
    if (status === 500) console.error('Unexpected request error');
    res.status(status).json({ error: status === 400 ? 'BAD_REQUEST' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR' });
  });
  return app;
}
