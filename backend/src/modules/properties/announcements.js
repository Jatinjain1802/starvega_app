import { Router } from 'express';
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories=['GENERAL','FOOD','ELECTRICITY','WATER','MAINTENANCE','EMERGENCY'];
const valid=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))?new Date(v):null;
const live=now=>({archivedAt:null,publishAt:{lte:now},OR:[{expiresAt:null},{expiresAt:{gt:now}}]});
const fields={id:true,title:true,body:true,category:true,pinned:true,publishAt:true,expiresAt:true,archivedAt:true,createdAt:true,updatedAt:true};
function payload(body){
 const {title,body:message,category,pinned=false,publishAt,expiresAt}=body??{};
 const start=publishAt===undefined?new Date():date(publishAt);
 const end=expiresAt==null?null:date(expiresAt);
 if(!valid(title,120)||!valid(message,4000)||!categories.includes(category)||typeof pinned!=='boolean'||!start||(expiresAt!=null&&!end)||(end&&end<=start))return null;
 return {title:title.trim(),body:message.trim(),category,pinned,publishAt:start,expiresAt:end};
}
export function createAnnouncementRouter(db){
 const router=Router({mergeParams:true});
 const staff=requireRole('OWNER','MANAGER');
 const scoped=req=>({propertyId:req.params.id,property:propertyScope(req.user)});
 router.use(async(req,res,next)=>{
  if(!uuid.test(req.params.id))return res.status(400).json({error:'INVALID_ID'});
  if(!await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}}))return res.status(404).json({error:'NOT_FOUND'});
  next();
 });
 router.get('/',async(req,res)=>{
  const resident=req.user.role==='RESIDENT';
  const where={...scoped(req),...(resident?live(new Date()):{})};
  const select={...fields,...(resident?{reads:{where:{userId:req.user.id},select:{readAt:true}}}:{author:{select:{id:true,name:true}},_count:{select:{reads:true}}})};
  const orderBy=[{pinned:'desc'},{publishAt:'desc'},{id:'asc'}];
  const [urgent,normal]=await db.$transaction([
   db.announcement.findMany({where:{...where,category:'EMERGENCY'},select,orderBy,take:100}),
   db.announcement.findMany({where:{...where,category:{not:'EMERGENCY'}},select,orderBy,take:100})
  ]);
  const items=[...urgent,...normal].slice(0,100).map(a=>resident?(({reads,...rest})=>({...rest,readAt:reads[0]?.readAt??null}))(a):a);
  return res.json({items});
 });
 router.post('/',staff,async(req,res)=>{
  const data=payload(req.body);
  if(!data)return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const announcement=await db.announcement.create({data:{...data,property:{connect:{id:req.params.id,...propertyScope(req.user)}},author:{connect:{id:req.user.id}}},select:fields});
   return res.status(201).json({announcement});
  }catch(err){if(err.code==='P2025')return res.status(404).json({error:'NOT_FOUND'});throw err;}
 });
 router.put('/:announcementId',staff,async(req,res)=>{
  if(!uuid.test(req.params.announcementId))return res.status(400).json({error:'INVALID_ID'});
  const data=payload(req.body);
  if(!data)return res.status(400).json({error:'INVALID_INPUT'});
  const changed=await db.announcement.updateMany({where:{id:req.params.announcementId,...scoped(req),archivedAt:null},data});
  return changed.count?res.status(204).end():res.status(404).json({error:'NOT_FOUND'});
 });
 router.delete('/:announcementId',staff,async(req,res)=>{
  if(!uuid.test(req.params.announcementId))return res.status(400).json({error:'INVALID_ID'});
  const changed=await db.announcement.updateMany({where:{id:req.params.announcementId,...scoped(req),archivedAt:null},data:{archivedAt:new Date()}});
  return changed.count?res.status(204).end():res.status(404).json({error:'NOT_FOUND'});
 });
 router.put('/:announcementId/read',requireRole('RESIDENT'),async(req,res)=>{
  if(!uuid.test(req.params.announcementId))return res.status(400).json({error:'INVALID_ID'});
  try{
   const ok=await db.$transaction(async tx=>{
    const a=await tx.announcement.findFirst({where:{id:req.params.announcementId,...scoped(req),...live(new Date())},select:{id:true}});
    if(!a)return false;
    await tx.announcementRead.upsert({where:{announcementId_userId:{announcementId:a.id,userId:req.user.id}},create:{announcementId:a.id,userId:req.user.id},update:{}});
    return true;
   },{isolationLevel:'Serializable'});
   return ok?res.status(204).end():res.status(404).json({error:'NOT_FOUND'});
  }catch(err){if(['P2002','P2034'].includes(err.code))return res.status(409).json({error:'RETRY'});throw err;}
 });
 return router;
}
