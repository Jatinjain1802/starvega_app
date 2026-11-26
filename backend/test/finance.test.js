import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFinance } from '../src/modules/properties/finance.js';
test('cash receipts and rent cohort balances are distinct',()=>{
 const x=summarizeFinance([{id:'a'}],[{propertyId:'a',amountPaise:10000,payments:[{amountPaise:4000}]}],[{rentDue:{propertyId:'a'},amountPaise:7000}],[{propertyId:'a',category:'MAINTENANCE',_sum:{totalPaise:2000}}],new Map());
 assert.equal(x.totals.outstandingPaise,6000);assert.equal(x.totals.netCashPaise,5000);assert.equal(x.totals.collectionPercent,40);
});
test('occupancy is weighted by bed count',()=>{
 const x=summarizeFinance([{id:'a'},{id:'b'}],[],[],[],new Map([['a',{rooms:1,occupiedRooms:1,beds:2,occupiedBeds:2}],['b',{rooms:2,occupiedRooms:1,beds:8,occupiedBeds:2}]]));
 assert.equal(x.totals.occupancyPercent,40);
});
