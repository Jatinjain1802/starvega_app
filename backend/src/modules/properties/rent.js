import { Router } from 'express';
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validMonth=m=>typeof m==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(m);
export function indiaMonth(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(now).filter(p=>['year','month'].includes(p.type)).sort((a,b)=>a.type==='year'?-1:1).map(p=>p.value).join('-');
}
export function summarizeDue(d,now=new Date()){
 const paidPaise=d.payments.reduce((n,p)=>n+p.amountPaise,0);
 const outstandingPaise=Math.max(0,d.amountPaise-paidPaise);
 return {...d,paidPaise,outstandingPaise,status:outstandingPaise===0?'PAID':new Date(d.dueAt)<now?'OVERDUE':paidPaise>0?'PARTIAL':'PENDING'};
}
export function createRentRouter(db){
 const router=Router({mergeParams:true});
 router.use(requireRole('OWNER','MANAGER'));
 router.use(async(req,res,next)=>{
  if(!uuid.test(req.params.id))return res.status(400).json({error:'INVALID_ID'});
  if(!await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}}))return res.status(404).json({error:'NOT_FOUND'});
  next();
 });
 router.patch('/settings',requireRole('OWNER'),async(req,res)=>{
  const {monthlyRentPaise,rentDueDay}=req.body??{};
  if(!Number.isInteger(monthlyRentPaise)||monthlyRentPaise<1||monthlyRentPaise>100000000||!Number.isInteger(rentDueDay)||rentDueDay<1||rentDueDay>28)return res.status(400).json({error:'INVALID_INPUT'});
  const result=await db.property.updateMany({where:{id:req.params.id,ownerId:req.user.id},data:{monthlyRentPaise,rentDueDay}});
  return result.count?res.status(204).end():res.status(404).json({error:'NOT_FOUND'});
 });
 router.post('/generate',requireRole('OWNER'),async(req,res)=>{
  const month=req.body?.month??indiaMonth();
  if(!validMonth(month)||month!==indiaMonth())return res.status(400).json({error:'CURRENT_MONTH_REQUIRED'});
  try{
   const result=await db.$transaction(async tx=>{
    const property=await tx.property.findFirst({where:{id:req.params.id,ownerId:req.user.id},select:{id:true,monthlyRentPaise:true,rentDueDay:true}});
    if(!property)return {error:'NOT_FOUND',status:404};
    if(!property.monthlyRentPaise)return {error:'RENT_NOT_CONFIGURED',status:409};
    const residents=await tx.allocation.findMany({where:{endedAt:null,resident:{active:true,role:'RESIDENT'},bed:{room:{propertyId:property.id}}},select:{residentId:true},distinct:['residentId']});
    const dueAt=new Date(month+'-'+String(property.rentDueDay).padStart(2,'0')+'T23:59:59.999+05:30');
    const rows=residents.map(({residentId})=>({propertyId:property.id,residentId,month,amountPaise:property.monthlyRentPaise,dueAt}));
    const created=rows.length?await tx.rentDue.createMany({data:rows,skipDuplicates:true}):{count:0};
    return {month,eligible:rows.length,created:created.count,existing:rows.length-created.count};
   },{isolationLevel:'Serializable'});
   return result.error?res.status(result.status).json({error:result.error}):res.json(result);
  }catch(err){if(err.code==='P2034')return res.status(409).json({error:'CONCURRENT_CHANGE_RETRY'});throw err;}
 });
 router.get('/',async(req,res)=>{
  const month=req.query.month??indiaMonth();
  if(!validMonth(month))return res.status(400).json({error:'INVALID_MONTH'});
  const dues=await db.rentDue.findMany({where:{propertyId:req.params.id,month,property:propertyScope(req.user)},select:{id:true,month:true,amountPaise:true,dueAt:true,resident:{select:{id:true,name:true}},payments:{select:{amountPaise:true}}},orderBy:{id:'asc'}});
  const items=dues.map(d=>summarizeDue(d));
  const summary=items.reduce((s,d)=>({billedPaise:s.billedPaise+d.amountPaise,collectedPaise:s.collectedPaise+d.paidPaise,outstandingPaise:s.outstandingPaise+d.outstandingPaise,overduePaise:s.overduePaise+(d.status==='OVERDUE'?d.outstandingPaise:0)}),{billedPaise:0,collectedPaise:0,outstandingPaise:0,overduePaise:0});
  return res.json({month,summary,items});
 });
 return router;
}
