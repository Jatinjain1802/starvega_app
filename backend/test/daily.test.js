import test from 'node:test';
import assert from 'node:assert/strict';
import { indiaDay } from '../src/jobs/daily.js';
test('IST month boundary',()=>assert.equal(indiaDay(new Date('2026-11-30T18:30:00Z')),'2026-12-01'));
test('before IST midnight',()=>assert.equal(indiaDay(new Date('2026-11-30T18:29:59Z')),'2026-11-30'));
