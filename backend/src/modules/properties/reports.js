import { Router } from 'express';
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function csvCell(value){
 let s=String(value??'');
 if(/^[\s\u0000-\u001f]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}
export function createReportRouter(db){
 const router=Router({mergeParams:true});
 router.use(requireRole('OWNER','MANAGER'));
 router.get('/:kind',async(req,res)=>{
  const {kind}=req.params,{month,format='json'}=req.query;
  if(!uuid.test(req.params.id)||typeof month!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!['json','csv'].includes(format)||!['rent','expenses','occupancy','complaints'].includes(kind))return res.status(400).json({error:'INVALID_INPUT'});
  const [y,m]=month.split('-').map(Number),start=new Date(Date.UTC(y,m-1,1)-19800000),end=new Date(Date.UTC(y,m,1)-19800000);
  const scope={propertyId:req.params.id,property:propertyScope(req.user)};
  const report=await db.$transaction(async tx=>{
   if(!await tx.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}}))return null;
   let columns,rows;
   if(kind==='rent'){
    columns=['resident','billedPaise','paidPaise','outstandingPaise'];
    const data=await tx.rentDue.findMany({where:{...scope,month},select:{resident:{select:{name:true}},amountPaise:true,payments:{select:{amountPaise:true}}},orderBy:{id:'asc'},take:10001});
    rows=data.map(d=>{const paid=d.payments.reduce((n,p)=>n+p.amountPaise,0);return [d.resident.name,d.amountPaise,paid,Math.max(0,d.amountPaise-paid)];});
   }else if(kind==='expenses'){
    columns=['date','category','description','manager','totalPaise','receiptCount'];
    const data=await tx.expense.findMany({where:{...scope,incurredAt:{gte:start,lt:end}},select:{incurredAt:true,category:true,description:true,totalPaise:true,author:{select:{name:true}},_count:{select:{receipts:true}}},orderBy:{id:'asc'},take:10001});
    rows=data.map(d=>[d.incurredAt.toISOString(),d.category,d.description,d.author.name,d.totalPaise,d._count.receipts]);
   }else if(kind==='occupancy'){
    columns=['room','beds','occupiedBeds','vacantBeds'];
    const data=await tx.room.findMany({where:scope,select:{label:true,beds:{select:{allocations:{where:{endedAt:null},select:{id:true},take:1}}}},orderBy:{id:'asc'},take:10001});
    rows=data.map(d=>{const occupied=d.beds.filter(b=>b.allocations.length).length;return [d.label,d.beds.length,occupied,d.beds.length-occupied];});
   }else{
    columns=['category','currentStatus','count'];
    const data=await tx.complaint.groupBy({by:['category','status'],where:{...scope,createdAt:{gte:start,lt:end}},_count:{_all:true}});
    rows=data.map(d=>[d.category,d.status,d._count._all]);
   }
   return {columns,rows};
  },{isolationLevel:'RepeatableRead'});
  if(!report)return res.status(404).json({error:'NOT_FOUND'});
  if(report.rows.length>10000)return res.status(422).json({error:'REPORT_TOO_LARGE'});
  const asOf=new Date().toISOString();
  if(format==='csv'){
   const csv=[report.columns,...report.rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
   return res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="'+kind+'-'+(kind==='occupancy'?asOf.slice(0,10):month)+'.csv"','Cache-Control':'no-store'}).send('\uFEFF'+csv);
  }
  return res.json({kind,month:kind==='occupancy'?null:month,asOf,currency:'INR',...report});
 });
 return router;
}
