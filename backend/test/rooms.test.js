import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRooms } from '../src/modules/properties/rooms.js';
test('empty property has zero occupancy',()=>assert.deepEqual(summarizeRooms([]).occupancy,{totalRooms:0,occupiedRooms:0,vacantRooms:0,totalBeds:0,occupiedBeds:0,vacantBeds:0}));
test('partially occupied rooms count as occupied and expose no resident details',()=>{
 const result=summarizeRooms([{id:'r',label:'101',beds:[{id:'b',label:'1',allocations:[{id:'a'}]},{id:'c',label:'2',allocations:[]}]}]);
 assert.deepEqual(result.occupancy,{totalRooms:1,occupiedRooms:1,vacantRooms:0,totalBeds:2,occupiedBeds:1,vacantBeds:1});
 assert.deepEqual(result.items[0].beds[0],{id:'b',label:'1',occupied:true});
});
