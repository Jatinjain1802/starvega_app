import test from 'node:test';
import assert from 'node:assert/strict';
import { indiaMonth,summarizeDue } from '../src/modules/properties/rent.js';
test('India month boundary',()=>assert.equal(indiaMonth(new Date('2026-01-31T18:30:00Z')),'2026-02'));
test('partial and overdue balances',()=>{
 const due={amountPaise:850000,dueAt:new Date('2026-02-05T18:29:59Z'),payments:[{amountPaise:300000}]};
 assert.equal(summarizeDue(due,new Date('2026-02-04')).status,'PARTIAL');
 const overdue=summarizeDue(due,new Date('2026-02-06'));
 assert.equal(overdue.status,'OVERDUE');
 assert.equal(overdue.outstandingPaise,550000);
});
test('fully paid rent is not overdue',()=>assert.equal(summarizeDue({amountPaise:100,payments:[{amountPaise:100}],dueAt:new Date(0)}).status,'PAID'));
