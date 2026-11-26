import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
const db=new PrismaClient();
test('database constraints and HTTP readiness',async()=>{
 const app=createApp({db,jwtSecret:process.env.JWT_SECRET});
 const server=app.listen(0,'127.0.0.1');
 try{
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base='http://127.0.0.1:'+server.address().port+'/api/v1';
  assert.equal((await fetch(base+'/ready')).status,200);
  assert.equal((await fetch(base+'/owner/finance?month=2026-11')).status,401);
  assert.equal((await fetch(base+'/notifications')).status,401);
  await db.$transaction(async tx=>{
   const owner=await tx.user.create({data:{phone:'+919000000001',name:'CI Owner',passwordHash:'not-a-login-hash',role:'OWNER'}});
   const resident=await tx.user.create({data:{phone:'+919000000002',name:'CI Resident',passwordHash:'not-a-login-hash',role:'RESIDENT'}});
   const property=await tx.property.create({data:{ownerId:owner.id,name:'CI PG',address:'CI only'}});
   const room=await tx.room.create({data:{propertyId:property.id,label:'101'}});
   const bed=await tx.bed.create({data:{roomId:room.id,label:'1'}});
   await tx.allocation.create({data:{bedId:bed.id,residentId:resident.id}});
   await assert.rejects(tx.allocation.create({data:{bedId:bed.id,residentId:resident.id}}),e=>e.code==='P2002');
   throw new Error('ROLLBACK_CI_FIXTURE');
  }).catch(e=>{if(e.message!=='ROLLBACK_CI_FIXTURE')throw e;});
 }finally{await new Promise(resolve=>server.close(resolve));await db.$disconnect();}
});
