import { propertyScope } from './access.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class Conflict extends Error { constructor(code,status=409){super(code);this.code=code;this.status=status;} }
const run=(db,fn)=>db.$transaction(fn,{isolationLevel:'Serializable'});
function handle(err,res){
 if(err instanceof Conflict)return res.status(err.status).json({error:err.code});
 if(['P2002','P2034'].includes(err.code))return res.status(409).json({error:'CONCURRENT_CHANGE'});
 throw err;
}
export function changeAllocation(db,transfer){
 return async(req,res)=>{
  const {allocationId}=req.params;
  const bedId=req.body?.bedId;
  if(!uuid.test(allocationId)||(transfer&&(typeof bedId!=='string'||!uuid.test(bedId))))return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const result=await run(db,async tx=>{
    const scope=propertyScope(req.user);
    const current=await tx.allocation.findFirst({where:{id:allocationId,endedAt:null,bed:{room:{propertyId:req.params.id,property:scope}}},select:{id:true,bedId:true,residentId:true}});
    if(!current)throw new Conflict('NOT_FOUND',404);
    if(transfer){
     if(current.bedId===bedId)throw new Conflict('SAME_BED');
     const target=await tx.bed.findFirst({where:{id:bedId,room:{propertyId:req.params.id,property:scope},allocations:{none:{endedAt:null}}},select:{id:true}});
     if(!target)throw new Conflict('BED_UNAVAILABLE');
    }
    const now=new Date();
    const closed=await tx.allocation.updateMany({where:{id:current.id,endedAt:null},data:{endedAt:now}});
    if(closed.count!==1)throw new Conflict('CONCURRENT_CHANGE');
    if(!transfer)return null;
    return tx.allocation.create({data:{residentId:current.residentId,bedId,startedAt:now},select:{id:true,residentId:true,bedId:true,startedAt:true}});
   });
   return transfer?res.status(201).json({allocation:result}):res.status(204).end();
  }catch(err){return handle(err,res);}
 };
}
export function assignExistingManager(db){
 return async(req,res)=>{
  const managerId=req.body?.managerId;
  if(typeof managerId!=='string'||!uuid.test(managerId))return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const assignment=await run(db,async tx=>{
    const target=await tx.property.findFirst({where:{id:req.params.id,ownerId:req.user.id},select:{id:true}});
    if(!target)throw new Conflict('NOT_FOUND',404);
    // Existing managers must already be associated with a property of this owner.
    const manager=await tx.user.findFirst({where:{id:managerId,role:'MANAGER',active:true,assignments:{some:{property:{ownerId:req.user.id}}}},select:{id:true}});
    if(!manager)throw new Conflict('NOT_FOUND',404);
    return tx.managerAssignment.upsert({where:{propertyId_managerId:{propertyId:target.id,managerId}},create:{propertyId:target.id,managerId},update:{}});
   });
   return res.json({assignment});
  }catch(err){return handle(err,res);}
 };
}
export function allocationHistory(db){
 return async(req,res)=>{
  const residentId=req.params.residentId;
  const cursor=req.query.cursor;
  if(!uuid.test(residentId)||(cursor!==undefined&&(typeof cursor!=='string'||!uuid.test(cursor))))return res.status(400).json({error:'INVALID_INPUT'});
  const rows=await db.allocation.findMany({where:{residentId,bed:{room:{propertyId:req.params.id,property:propertyScope(req.user)}},...(cursor?{id:{gt:cursor}}:{})},select:{id:true,startedAt:true,endedAt:true,bed:{select:{id:true,label:true,room:{select:{id:true,label:true}}}}},orderBy:{id:'asc'},take:51});
  return res.json({items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null});
 };
}
