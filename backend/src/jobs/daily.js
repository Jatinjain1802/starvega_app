import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { notify } from '../modules/notifications/routes.js';
export function indiaDay(now=new Date()){
 return new Date(now.getTime()+19800000).toISOString().slice(0,10);
}
export async function runDaily(db,now=new Date()){
 const day=indiaDay(now),month=day.slice(0,7);
 const properties=await db.property.findMany({where:{owner:{active:true}},select:{id:true}});
 for(const {id} of properties){
  await db.$transaction(async tx=>{
   const pg=await tx.property.findUnique({where:{id},select:{monthlyRentPaise:true,rentDueDay:true}});
   if(!pg)return;
   const residents=await tx.allocation.findMany({where:{endedAt:null,resident:{active:true,role:'RESIDENT'},bed:{room:{propertyId:id}}},select:{residentId:true},distinct:['residentId']});
   const ids=residents.map(r=>r.residentId);
   if(pg.monthlyRentPaise&&ids.length){
    const dueAt=new Date(month+'-'+String(pg.rentDueDay).padStart(2,'0')+'T23:59:59.999+05:30');
    await tx.rentDue.createMany({data:ids.map(residentId=>({propertyId:id,residentId,month,amountPaise:pg.monthlyRentPaise,dueAt})),skipDuplicates:true});
   }
   const dues=await tx.rentDue.findMany({where:{propertyId:id,resident:{active:true},dueAt:{lte:new Date(now.getTime()+3*86400000)}},select:{id:true,residentId:true,dueAt:true,amountPaise:true,payments:{select:{amountPaise:true}}}});
   for(const d of dues){
    if(d.payments.reduce((n,p)=>n+p.amountPaise,0)>=d.amountPaise)continue;
    const overdue=d.dueAt<now;
    const stage=overdue?'overdue':'upcoming';
    await notify(tx,[d.residentId],{kind:'RENT',title:overdue?'Rent overdue':'Rent due soon',body:'Check your rent dashboard for the outstanding balance.',dedupeKey:'rent:'+d.id+':'+stage});
   }
   const announcements=await tx.announcement.findMany({where:{propertyId:id,archivedAt:null,publishAt:{lte:now},OR:[{expiresAt:null},{expiresAt:{gt:now}}]},select:{id:true,category:true,publishAt:true}});
   for(const a of announcements){
    if(a.publishAt.getTime()<now.getTime()-86400000)continue;
    await notify(tx,ids,{kind:'ANNOUNCEMENT',title:a.category==='EMERGENCY'?'Emergency PG announcement':'New PG announcement',body:'Open your PG announcements for details.',dedupeKey:'announcement:'+a.id});
   }
  },{isolationLevel:'Serializable',timeout:30000});
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const db=new PrismaClient();
 try{await runDaily(db);console.log('Daily job completed');}catch(e){console.error('Daily job failed',e.code??e.name);process.exitCode=1;}finally{await db.$disconnect();}
}
