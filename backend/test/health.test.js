import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

for (const available of [true, false]) {
  test(`health and readiness (database available: ${available})`, async () => {
    const db = { $queryRaw: async () => { if (!available) throw new Error('offline'); return [{ '?column?': 1 }]; } };
    const server = createApp({ db }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const base = `http://127.0.0.1:${server.address().port}/api/v1`;
      assert.equal((await fetch(`${base}/health`)).status, 200);
      const ready = await fetch(`${base}/ready`);
      assert.equal(ready.status, available ? 200 : 503);
      assert.equal((await ready.json()).status, available ? 'ready' : 'unavailable');
      assert.equal((await fetch(`${base}/missing`)).status, 404);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
}
