import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyScope, canAccessProperty } from '../src/modules/properties/access.js';
import { hashPassword, verifyPassword } from '../src/modules/auth/password.js';
test('owner and manager scopes are distinct', () => {
  assert.deepEqual(propertyScope({id:'a',active:true,role:'OWNER'}), {ownerId:'a'});
  assert.deepEqual(propertyScope({id:'b',active:true,role:'MANAGER'}), {managers:{some:{managerId:'b'}}});
  assert.throws(() => propertyScope({id:'a',active:false,role:'OWNER'}));
  assert.throws(() => propertyScope({id:'a',active:true,role:'UNKNOWN'}));
});
test('resident scope requires an active allocation', () => {
  assert.deepEqual(propertyScope({id:'r',active:true,role:'RESIDENT'}), {rooms:{some:{beds:{some:{allocations:{some:{residentId:'r',endedAt:null}}}}}}});
});
test('access combines property ID and role scope', async () => {
  const db = {property:{findFirst:async ({where}) => {assert.deepEqual(where.AND,[{id:'p'},{ownerId:'a'}]); return null;}}};
  assert.equal(await canAccessProperty(db,{id:'a',active:true,role:'OWNER'},'p'),false);
});
test('password hashes are salted and verify correctly', async () => {
  const password = 'example-password-123';
  const hash = await hashPassword(password);
  assert.notEqual(hash, await hashPassword(password));
  assert.equal(await verifyPassword(password,hash),true);
  assert.equal(await verifyPassword('wrong',hash),false);
});
