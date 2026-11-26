import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pct=(a,b)=>b?Math.round(a/b*10000)/100:null;
export function summarizeFinance(properties,dues,payments,expenses,occupancy){
 const rows=properties.map(p=>{
  const d=dues.filter(x=>x.propertyId===p.id);
  const billedPaise=d.reduce((n,x)=>n+x.amountPaise,0);
  const paidAgainstDuesPaise=d.reduce((n,x)=>n+x.payments.reduce((m,y)=>m+y.amountPaise,0),0);
  const collectedPaise=payments.filter(x=>x.rentDue.propertyId===p.id).reduce((n,x)=>n+x.amountPaise,0);
  const e=expenses.filter(x=>x.propertyId===p.id);
  const expensePaise=e.reduce((n,x)=>n+(x._sum.totalPaise??0),0);
  const maintenancePaise=e.filter(x=>x.category==='MAINTENANCE').reduce((n,x)=>n+(x._sum.totalPaise??0),0);
  const o=occupancy.get(p.id)??{rooms:0,occupiedRooms:0,beds:0,occupiedBeds:0};
  return {...p,billedPaise,paidAgainstDuesPaise,outstandingPaise:d.reduce((n,x)=>n+Math.max(0,x.amountPaise-x.payments.reduce((m,y)=>m+y.amountPaise,0)),0),collectedPaise,expensePaise,maintenancePaise,netCashPaise:collectedPaise-expensePaise,...o,collectionPercent:pct(paidAgainstDuesPaise,billedPaise),occupancyPercent:pct(o.occupiedBeds,o.beds),expenseCategories:e.map(x=>({category:x.category,totalPaise:x._sum.totalPaise??0}))};
 });
 const keys=['billedPaise','paidAgainstDuesPaise','outstandingPaise','collectedPaise','expensePaise','maintenancePaise','netCashPaise','rooms','occupiedRooms','beds','occupiedBeds'];
 const totals=Object.fromEntries(keys.map(k=>[k,rows.reduce((n,x)=>n+x[k],0)]));
 return {properties:rows,totals:{...totals,collectionPercent:pct(totals.paidAgainstDuesPaise,totals.billedPaise),occupancyPercent:pct(totals.occupiedBeds,totals.beds)}};
}
export function createFinanceRouter(db,secret){
 const router=Router();
 router.use(authenticate(db,secret),requireRole('OWNER'));
 router.get('/',async(req,res)=>{
  const {month,propertyId}=req.query;
  if(typeof month!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||(propertyId!==undefined&&(typeof propertyId!=='string'||!uuid.test(propertyId))))return res.status(400).json({error:'INVALID_INPUT'});
  const [y,m]=month.split('-').map(Number);
  const start=new Date(Date.UTC(y,m-1,1)-19800000),end=new Date(Date.UTC(y,m,1)-19800000);
  const result=await db.$transaction(async tx=>{
   const properties=await tx.property.findMany({where:{ownerId:req.user.id,...(propertyId?{id:propertyId}:{})},select:{id:true,name:true,address:true},orderBy:{id:'asc'}});
   if(propertyId&&!properties.length)return null;
   const ids=properties.map(p=>p.id);
   const dues=await tx.rentDue.findMany({where:{propertyId:{in:ids},month},select:{propertyId:true,amountPaise:true,payments:{select:{amountPaise:true}}}});
   const payments=await tx.rentPayment.findMany({where:{rentDue:{propertyId:{in:ids}},paidAt:{gte:start,lt:end}},select:{amountPaise:true,rentDue:{select:{propertyId:true}}}});
   const expenses=await tx.expense.groupBy({by:['propertyId','category'],where:{propertyId:{in:ids},incurredAt:{gte:start,lt:end}},_sum:{totalPaise:true}});
   const rooms=await tx.room.findMany({where:{propertyId:{in:ids}},select:{propertyId:true,beds:{select:{allocations:{where:{endedAt:null},select:{id:true},take:1}}}}});
   const occupancy=new Map();
   for(const room of rooms){
    const o=occupancy.get(room.propertyId)??{rooms:0,occupiedRooms:0,beds:0,occupiedBeds:0};
    const occupied=room.beds.filter(b=>b.allocations.length).length;
    o.rooms++;o.occupiedRooms+=Number(occupied>0);o.beds+=room.beds.length;o.occupiedBeds+=occupied;occupancy.set(room.propertyId,o);
   }
   return summarizeFinance(properties,dues,payments,expenses,occupancy);
  },{isolationLevel:'RepeatableRead'});
  return result?res.json({month,currency:'INR',occupancyAsOf:new Date().toISOString(),...result}):res.status(404).json({error:'NOT_FOUND'});
 });
 return router;
}
