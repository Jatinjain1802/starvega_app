import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function notify(tx,userIds,{kind,title,body,dedupeKey}){
 const ids=[...new Set(userIds)];
 if(ids.length)await tx.notification.createMany({data:ids.map(userId=>({userId,kind,title,body,dedupeKey})),skipDuplicates:true});
}
export function createNotificationRouter(db,secret){
 const router=Router();
 router.use(authenticate(db,secret));
 router.put('/devices',async(req,res)=>{
  const {token,platform}=req.body??{};
  if(typeof token!=='string'||token.length<20||token.length>4096||/\s/.test(token)||!['ANDROID','IOS'].includes(platform))return res.status(400).json({error:'INVALID_DEVICE'});
  await db.pushDevice.upsert({where:{token},create:{token,platform,userId:req.user.id},update:{platform,userId:req.user.id}});
  return res.status(204).end();
 });
 router.delete('/devices',async(req,res)=>{
  const token=req.body?.token;
  if(typeof token!=='string'||token.length>4096)return res.status(400).json({error:'INVALID_DEVICE'});
  await db.pushDevice.deleteMany({where:{token,userId:req.user.id}});
  return res.status(204).end();
 });
 router.get('/',async(req,res)=>{
  const cursor=req.query.cursor;
  if(cursor!==undefined&&(typeof cursor!=='string'||!uuid.test(cursor)))return res.status(400).json({error:'INVALID_CURSOR'});
  const anchor=cursor?await db.notification.findFirst({where:{id:cursor,userId:req.user.id},select:{createdAt:true,id:true}}):null;
  if(cursor&&!anchor)return res.status(400).json({error:'INVALID_CURSOR'});
  const rows=await db.notification.findMany({where:{userId:req.user.id,...(anchor?{OR:[{createdAt:{lt:anchor.createdAt}},{createdAt:anchor.createdAt,id:{lt:anchor.id}}]}:{})},select:{id:true,kind:true,title:true,body:true,readAt:true,createdAt:true},orderBy:[{createdAt:'desc'},{id:'desc'}],take:51});
  const unread=await db.notification.count({where:{userId:req.user.id,readAt:null}});
  res.json({items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null,unread});
 });
 router.put('/read-all',async(req,res)=>{
  await db.notification.updateMany({where:{userId:req.user.id,readAt:null},data:{readAt:new Date()}});
  res.status(204).end();
 });
 router.put('/:id/read',async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(400).json({error:'INVALID_ID'});
  const row=await db.notification.findFirst({where:{id:req.params.id,userId:req.user.id},select:{id:true}});
  if(!row)return res.status(404).json({error:'NOT_FOUND'});
  await db.notification.updateMany({where:{id:row.id,userId:req.user.id,readAt:null},data:{readAt:new Date()}});
  res.status(204).end();
 });
 return router;
}
