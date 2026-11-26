import { Router } from 'express';
import { getReceipt } from '../payments/receipts.js';
import { authenticate, requireRole } from '../auth/middleware.js';
export function createResidentRouter(db,secret){
 const router=Router();
 router.use(authenticate(db,secret),requireRole('RESIDENT'));
 router.get('/payments/:paymentId/receipt',getReceipt(db));
 router.get('/dashboard',async(req,res)=>{
  const resident=await db.user.findUnique({where:{id:req.user.id},select:{id:true,name:true,phone:true}});
  const allocation=await db.allocation.findFirst({where:{residentId:req.user.id,endedAt:null},select:{id:true,startedAt:true,bed:{select:{id:true,label:true,room:{select:{id:true,label:true,property:{select:{id:true,name:true,address:true,managers:{where:{manager:{active:true,role:'MANAGER'}},select:{manager:{select:{id:true,name:true,phone:true}}},orderBy:{managerId:'asc'}}}}}}}}}});
  const dues=await db.rentDue.findMany({where:{residentId:req.user.id},select:{amountPaise:true,payments:{select:{amountPaise:true}}}});
  const outstandingPaise=dues.reduce((total,d)=>total+Math.max(0,d.amountPaise-d.payments.reduce((n,p)=>n+p.amountPaise,0)),0);
  return res.json({resident,allocation,outstandingPaise});
 });
 router.get('/rent',async(req,res)=>{
  const cursor=req.query.cursor;
  if(cursor!==undefined&&(typeof cursor!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor)))return res.status(400).json({error:'INVALID_CURSOR'});
  const rows=await db.rentDue.findMany({where:{residentId:req.user.id,...(cursor?{id:{gt:cursor}}:{})},select:{id:true,month:true,amountPaise:true,dueAt:true,property:{select:{id:true,name:true}},payments:{select:{id:true,amountPaise:true,reference:true,method:true,paidAt:true}}},orderBy:{id:'asc'},take:51});
  return res.json({items:rows.slice(0,50).map(d=>({...d,outstandingPaise:Math.max(0,d.amountPaise-d.payments.reduce((n,p)=>n+p.amountPaise,0))})),nextCursor:rows.length>50?rows[49].id:null});
 });
 return router;
}
