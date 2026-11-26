import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateItems } from '../src/modules/properties/expenses.js';
test('fractional grocery quantities',()=>assert.equal(calculateItems([{name:'Rice',unit:'kg',quantityMilli:2500,unitPricePaise:6000}]).totalPaise,15000));
test('reject negative price',()=>assert.equal(calculateItems([{name:'Rice',unit:'kg',quantityMilli:1000,unitPricePaise:-1}]),null));
test('reject empty expense',()=>assert.equal(calculateItems([]),null));
