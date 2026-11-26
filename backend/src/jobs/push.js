import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { pathToFileURL } from 'node:url';
export async function dispatchPush(db,messaging){
 const rows=await db.notification.findMany({where:{pushProcessedAt:null,user:{active:true}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:100,select:{id:true,userId:true,readAt:true,createdAt:true}});
 for(const row of rows){
  // Generic content avoids exposing account information on shared devices.
  if(!row.readAt&&Date.now()-row.createdAt.getTime()<86400000){
   const devices=await db.pushDevice.findMany({where:{userId:row.userId,user:{active:true}},select:{id:true,token:true}});
   let retry=false;
   for(const device of devices){
    if(!await db.pushDevice.findFirst({where:{id:device.id,userId:row.userId,token:device.token,user:{active:true}},select:{id:true}}))continue;
    try{
     await messaging.send({token:device.token,notification:{title:'Starvega PG',body:'You have a new update. Open the app to view it.'},android:{collapseKey:'starvega-update'},apns:{headers:{'apns-collapse-id':'starvega-update'}}});
    }catch(e){
     if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(e.code)){
      await db.pushDevice.deleteMany({where:{id:device.id,userId:row.userId,token:device.token}});
     }else{retry=true;}
    }
   }
   if(retry)continue;
  }
  await db.notification.updateMany({where:{id:row.id,pushProcessedAt:null},data:{pushProcessedAt:new Date()}});
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const db=new PrismaClient();
 try{
  if(process.env.FCM_ENABLED!=='true')throw new Error('FCM_ENABLED must be true');
  initializeApp({credential:applicationDefault()});
  await dispatchPush(db,getMessaging());
 }catch(e){console.error('Push job failed',e.code??e.name);process.exitCode=1;}finally{await db.$disconnect();}
}
