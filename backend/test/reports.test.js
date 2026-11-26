import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell } from '../src/modules/properties/reports.js';
test('escapes embedded quotes',()=>assert.equal(csvCell('a"b'),'"a""b"'));
test('neutralizes spreadsheet formulas',()=>assert.equal(csvCell('=1+1'),'"\'=1+1"'));
test('preserves ordinary numeric values',()=>assert.equal(csvCell(8500),'"8500"'));
