import { Router } from 'express';
import { notify } from '../notifications/routes.js';
import { propertyScope } from './access.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const valid=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
const scope=req=>({propertyId:req.params.id,property:propertyScope(req.user),...(req.user.role==='RESIDENT'?{OR:[{visibility:'COMMON'},{residentId:req.user.id}]}:{})});
const fields={id:true,title:true,description:true,category:true,visibility:true,safety:true,status:true,createdAt:true,updatedAt:true,_count:{select:{likes:true}}};
export function createComplaintRouter(db){
 const router=Router({mergeParams:true});
 router.use(async(req,res,next)=>{
  if(!uuid.test(req.params.id))return res.status(400).json({error:'INVALID_ID'});
  if(!await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}}))return res.status(404).json({error:'NOT_FOUND'});
  next();
 });
 router.get('/',async(req,res)=>{
  const items=await db.complaint.findMany({where:scope(req),select:{...fields,...(req.user.role!=='RESIDENT'?{resident:{select:{id:true,name:true}}}:{})},orderBy:[{safety:'desc'},{likes:{_count:'desc'}},{createdAt:'desc'},{id:'asc'}],take:100});
  res.json({items});
 });
 router.post('/',async(req,res)=>{
  if(req.user.role!=='RESIDENT')return res.status(403).json({error:'FORBIDDEN'});
  const {title,description,category,visibility,safety=false}=req.body??{};
  if(!valid(title,120)||!valid(description,3000)||!valid(category,60)||!['COMMON','PRIVATE'].includes(visibility)||typeof safety!=='boolean')return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const complaint=await db.$transaction(async tx=>{
   const complaint=await tx.complaint.create({data:{property:{connect:{id:req.params.id,...propertyScope(req.user)}},resident:{connect:{id:req.user.id}},title:title.trim(),description:description.trim(),category:category.trim(),visibility,safety,events:{create:{actorId:req.user.id,status:'OPEN'}}},select:fields});
   if(safety){
    const pg=await tx.property.findUnique({where:{id:req.params.id},select:{owner:{select:{id:true,active:true}},managers:{where:{manager:{active:true}},select:{managerId:true}}}});
    await notify(tx,[...(pg.owner.active?[pg.owner.id]:[]),...pg.managers.map(m=>m.managerId)],{kind:'SAFETY',title:'Urgent safety complaint',body:'A safety concern was reported. Open your PG complaints to review it.',dedupeKey:'safety:'+complaint.id});
   }
   return complaint;
   },{isolationLevel:'Serializable'});
   return res.status(201).json({complaint});
  }catch(err){if(err.code==='P2025')return res.status(404).json({error:'NOT_FOUND'});throw err;}
 });
 router.get('/:complaintId',async(req,res)=>{
  if(!uuid.test(req.params.complaintId))return res.status(400).json({error:'INVALID_ID'});
  const complaint=await db.complaint.findFirst({where:{id:req.params.complaintId,...scope(req)},select:{...fields,events:{select:{status:true,note:true,createdAt:true,...(req.user.role!=='RESIDENT'?{actorId:true}:{})},orderBy:{createdAt:'asc'}}}});
  return complaint?res.json({complaint}):res.status(404).json({error:'NOT_FOUND'});
 });
 for(const [method,liked] of [['put',true],['delete',false]])router[method]('/:complaintId/like',async(req,res)=>{
  if(req.user.role!=='RESIDENT')return res.status(403).json({error:'FORBIDDEN'});
  if(!uuid.test(req.params.complaintId))return res.status(400).json({error:'INVALID_ID'});
  try{
   const ok=await db.$transaction(async tx=>{
    const c=await tx.complaint.findFirst({where:{id:req.params.complaintId,propertyId:req.params.id,property:propertyScope(req.user),visibility:'COMMON'},select:{id:true}});
    if(!c)return false;
    if(liked)await tx.complaintLike.upsert({where:{complaintId_userId:{complaintId:c.id,userId:req.user.id}},create:{complaintId:c.id,userId:req.user.id},update:{}});
    else await tx.complaintLike.deleteMany({where:{complaintId:c.id,userId:req.user.id}});
    return true;
   },{isolationLevel:'Serializable'});
   return ok?res.status(204).end():res.status(404).json({error:'NOT_FOUND'});
  }catch(err){if(['P2002','P2034'].includes(err.code))return res.status(409).json({error:'RETRY'});throw err;}
 });
 router.patch('/:complaintId/status',async(req,res)=>{
  const {status,note}=req.body??{};
  if(!uuid.test(req.params.complaintId)||!['IN_PROGRESS','RESOLVED','REOPENED'].includes(status)||!valid(note,1000))return res.status(400).json({error:'INVALID_INPUT'});
  const resident=req.user.role==='RESIDENT';
  if(resident&&status!=='REOPENED')return res.status(403).json({error:'FORBIDDEN'});
  const allowed=status==='REOPENED'?['RESOLVED']:status==='IN_PROGRESS'?['OPEN','REOPENED']:['OPEN','IN_PROGRESS','REOPENED'];
  try{
   const result=await db.$transaction(async tx=>{
    const where={id:req.params.complaintId,...scope(req),...(resident?{residentId:req.user.id}:{})};
    const c=await tx.complaint.findFirst({where,select:{id:true,status:true,residentId:true}});
    if(!c)return 404;
    if(!allowed.includes(c.status))return 409;
    const changed=await tx.complaint.updateMany({where:{...where,status:c.status},data:{status}});
    if(changed.count!==1)return 409;
    const event=await tx.complaintEvent.create({data:{complaintId:c.id,actorId:req.user.id,status,note:note.trim()}});
    await notify(tx,[c.residentId],{kind:'COMPLAINT',title:'Complaint status updated',body:'Open your complaints to review the latest status.',dedupeKey:'complaint:'+event.id});
    return 204;
   },{isolationLevel:'Serializable'});
   return result===204?res.status(204).end():res.status(result).json({error:result===404?'NOT_FOUND':'INVALID_TRANSITION'});
  }catch(err){if(err.code==='P2034')return res.status(409).json({error:'RETRY'});throw err;}
 });
 return router;
}
