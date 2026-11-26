import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient();
const server = createApp({ db }).listen(port, () => console.log(`API listening on ${port}`));
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => process.exit(1), 10000);
  timer.unref();
  server.close(async () => {
    try { await db.$disconnect(); process.exitCode = 0; }
    catch { process.exitCode = 1; }
    finally { clearTimeout(timer); }
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
