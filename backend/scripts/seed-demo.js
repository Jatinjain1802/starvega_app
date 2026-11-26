import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {createHash} from 'node:crypto';
import {hashPassword} from '../src/modules/auth/password.js';
if(process.env.NODE_ENV!=='development'||process.env.ALLOW_DEMO_SEED!=='yes')throw Error('Explicit development seed opt-in required');
const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/starvega')throw Error('Seed requires local starvega database');
const password=process.env.DEMO_PASSWORD;
if(!password||password.length<12||password.length>128)throw Error('Set DEMO_PASSWORD (12–128 characters)');
const db=new PrismaClient();
const id=n=>'d0000000-0000-4000-8000-'+String(n).padStart(12,'0');
const phone=n=>'+91900000'+String(n).padStart(4,'0');
const now=new Date(),month=new Date(now.getTime()+19800000).toISOString().slice(0,7);
const dueAt=new Date(month+'-05T23:59:59.999+05:30');
const hash=await hashPassword(password);
// Valid tiny PNG fixture, not a real financial document.
const receipt=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=','base64');
try{
 const seeded=await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261126)`;
  if(await tx.user.findUnique({where:{id:id(1)}}))return false;
  if(await tx.user.count())throw Error('Seed requires an empty user table; existing data is not modified');
  const user=(n,name,role)=>({id:id(n),phone:phone(n),name,role,passwordHash:hash});
  await tx.user.createMany({data:[user(1,'Demo Owner','OWNER'),user(2,'Demo Manager A','MANAGER'),user(3,'Demo Manager B','MANAGER'),...Array.from({length:9},(_,i)=>user(10+i,'Demo Resident '+(i+1),'RESIDENT'))]});
  for(let p=0;p<3;p++){
   const propertyId=id(100+p),managerId=id(p===2?3:2);
   await tx.property.create({data:{id:propertyId,ownerId:id(1),name:'Demo PG – '+['BTM','HSR','Koramangala'][p],address:'Fictional demo property, Bengaluru',monthlyRentPaise:850000,rentDueDay:5}});
   await tx.managerAssignment.create({data:{propertyId,managerId}});
   for(let r=0;r<3;r++){
    const roomId=id(200+p*10+r);
    await tx.room.create({data:{id:roomId,propertyId,label:String(101+r)}});
    for(let b=0;b<2;b++){
     const bedId=id(300+p*20+r*2+b);
     await tx.bed.create({data:{id:bedId,roomId,label:String(b+1)}});
     if(b===0&&r<3){
      const residentId=id(10+p*3+r),rentDueId=id(400+p*10+r);
      await tx.allocation.create({data:{bedId,residentId,startedAt:new Date(month+'-01T00:00:00+05:30')}});
      await tx.rentDue.create({data:{id:rentDueId,propertyId,residentId,month,amountPaise:850000,dueAt}});
      if(r<2)await tx.rentPayment.create({data:{rentDueId,amountPaise:r===0?850000:400000,reference:'demo-payment-'+p+'-'+r,method:'CASH',recordedById:managerId}});
      const complaintId=id(500+p*10+r),visibility=r===1?'PRIVATE':'COMMON';
      await tx.complaint.create({data:{id:complaintId,propertyId,residentId,title:['Demo water issue','Demo private room issue','Demo safety concern'][r],description:'Synthetic test complaint; no real incident.',category:r===2?'SECURITY':'MAINTENANCE',visibility,safety:r===2,events:{create:{actorId:residentId,status:'OPEN',note:'Demo complaint created'}}}});
      await tx.notification.create({data:{userId:residentId,kind:'RENT_REMINDER',title:'Demo rent update',body:'Sample notification for local testing.',dedupeKey:'demo-rent-'+p+'-'+r}});
     }
    }
   }
   await tx.complaintLike.create({data:{complaintId:id(500+p*10),userId:id(11+p*3)}});
   for(let e=0;e<2;e++){
    const totalPaise=e===0?485000:250000,expenseId=id(600+p*10+e);
    await tx.expense.create({data:{id:expenseId,propertyId,authorId:managerId,category:e===0?'GROCERY':'MAINTENANCE',description:e===0?'DEMO grocery purchase':'DEMO motor repair',vendor:'Fictional vendor',paymentMethod:'CASH',incurredAt:now,totalPaise,requestKey:id(700+p*10+e),items:{create:{name:e===0?'Sample groceries':'Sample repair',unit:'lot',quantityMilli:1000,unitPricePaise:totalPaise,totalPaise}},receipts:{create:{contentType:'image/png',sizeBytes:receipt.length,sha256:createHash('sha256').update(receipt).digest('hex'),data:receipt}}}});
    if(e===1)await tx.maintenanceTask.create({data:{propertyId,authorId:managerId,complaintId:id(500+p*10),expenseId,title:'Demo motor repair',description:'Synthetic maintenance task',technician:'Demo technician',events:{create:{actorId:managerId,status:'OPEN',note:'Demo task created'}}}});
   }
   await tx.announcement.create({data:{propertyId,authorId:managerId,title:'Demo food menu update',body:'Sample announcement for local testing.',category:'FOOD',pinned:true}});
   for(const userId of [id(1),managerId])await tx.notification.create({data:{userId,kind:'SAFETY_COMPLAINT',title:'Demo safety alert',body:'Synthetic safety notification.',dedupeKey:'demo-safety-'+p}});
  }
  return true;
 },{timeout:60000});
 console.log(seeded?'Demo data created.':'Demo owner already exists; no changes made.');
 console.log('Owner:',phone(1),'Managers:',phone(2),phone(3),'Residents:',phone(10),'through',phone(18));
}finally{await db.$disconnect();}
