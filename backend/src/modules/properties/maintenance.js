import { Router } from 'express';
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const valid=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
const fields={id:true,title:true,description:true,technician:true,status:true,complaintId:true,createdAt:true,updatedAt:true,author:{select:{id:true,name:true}},expense:{select:{id:true,totalPaise:true,receipts:{select:{id:true,contentType:true,sizeBytes:true}}}}};
const transitions={OPEN:['IN_PROGRESS','COMPLETED','CANCELLED'],IN_PROGRESS:['COMPLETED','CANCELLED'],COMPLETED:[],CANCELLED:[]};
export function createMaintenanceRouter(db){
 const router=Router({mergeParams:true});
 router.use(requireRole('OWNER','MANAGER'));
 const manager=requireRole('MANAGER');
 const scope=req=>({propertyId:req.params.id,property:propertyScope(req.user)});
 router.use(async(req,res,next)=>{
  if(!uuid(req.params.id))return res.status(400).json({error:'INVALID_ID'});
  if(!await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}}))return res.status(404).json({error:'NOT_FOUND'});
  next();
 });
 router.get('/',async(req,res)=>{
  const {cursor,status}=req.query;
  if((cursor!==undefined&&!uuid(cursor))||(status!==undefined&&!Object.hasOwn(transitions,status)))return res.status(400).json({error:'INVALID_INPUT'});
  const rows=await db.maintenanceTask.findMany({where:{...scope(req),...(cursor?{id:{gt:cursor}}:{}),...(status?{status}:{})},select:fields,orderBy:{id:'asc'},take:51});
  res.json({items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null});
 });
 router.post('/',manager,async(req,res)=>{
  const {title,description,technician,complaintId}=req.body??{};
  if(!valid(title,120)||!valid(description,3000)||(technician!=null&&!valid(technician,120))||(complaintId!=null&&!uuid(complaintId)))return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const task=await db.$transaction(async tx=>{
    if(!await tx.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}}))return null;
    if(complaintId&&!await tx.complaint.findFirst({where:{id:complaintId,...scope(req)},select:{id:true}}))return null;
    return tx.maintenanceTask.create({data:{propertyId:req.params.id,authorId:req.user.id,complaintId:complaintId??null,title:title.trim(),description:description.trim(),technician:technician?.trim()??null,events:{create:{actorId:req.user.id,status:'OPEN',note:'Task created'}}},select:fields});
   },{isolationLevel:'Serializable'});
   return task?res.status(201).json({task}):res.status(404).json({error:'NOT_FOUND'});
  }catch(e){if(e.code==='P2034')return res.status(409).json({error:'RETRY'});throw e;}
 });
 router.get('/:taskId',async(req,res)=>{
  if(!uuid(req.params.taskId))return res.status(400).json({error:'INVALID_ID'});
  const task=await db.maintenanceTask.findFirst({where:{id:req.params.taskId,...scope(req)},select:{...fields,events:{select:{status:true,note:true,createdAt:true,actor:{select:{id:true,name:true}}},orderBy:{createdAt:'asc'}}}});
  return task?res.json({task}):res.status(404).json({error:'NOT_FOUND'});
 });
 router.patch('/:taskId/status',manager,async(req,res)=>{
  const {status,note}=req.body??{};
  if(!uuid(req.params.taskId)||typeof status!=='string'||!Object.hasOwn(transitions,status)||!valid(note,1000))return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const result=await db.$transaction(async tx=>{
    const where={id:req.params.taskId,...scope(req)};
    const task=await tx.maintenanceTask.findFirst({where,select:{id:true,status:true}});
    if(!task)return 404;
    if(!transitions[task.status].includes(status))return 409;
    const changed=await tx.maintenanceTask.updateMany({where:{...where,status:task.status},data:{status}});
    if(changed.count!==1)return 409;
    await tx.maintenanceEvent.create({data:{taskId:task.id,actorId:req.user.id,status,note:note.trim()}});
    return 204;
   },{isolationLevel:'Serializable'});
   return result===204?res.status(204).end():res.status(result).json({error:result===404?'NOT_FOUND':'INVALID_TRANSITION'});
  }catch(e){if(e.code==='P2034')return res.status(409).json({error:'RETRY'});throw e;}
 });
 router.put('/:taskId/expense',manager,async(req,res)=>{
  const expenseId=req.body?.expenseId;
  if(!uuid(req.params.taskId)||!uuid(expenseId))return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const result=await db.$transaction(async tx=>{
    const where={id:req.params.taskId,...scope(req)};
    const task=await tx.maintenanceTask.findFirst({where,select:{id:true,expenseId:true}});
    if(!task)return 404;
    if(task.expenseId===expenseId)return 204;
    if(task.expenseId)return 409;
    const expense=await tx.expense.findFirst({where:{id:expenseId,...scope(req),category:'MAINTENANCE',receipts:{some:{}}},select:{id:true}});
    if(!expense)return 404;
    const changed=await tx.maintenanceTask.updateMany({where:{...where,expenseId:null},data:{expenseId}});
    return changed.count===1?204:409;
   },{isolationLevel:'Serializable'});
   return result===204?res.status(204).end():res.status(result).json({error:result===404?'NOT_FOUND':'EXPENSE_LINK_CONFLICT'});
  }catch(e){if(['P2002','P2034'].includes(e.code))return res.status(409).json({error:'EXPENSE_LINK_CONFLICT'});throw e;}
 });
 return router;
}
