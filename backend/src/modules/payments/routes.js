import { Router, raw } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { authenticate, requireRole } from '../auth/middleware.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function verifyWebhook(body,signature,secret){
 if(!Buffer.isBuffer(body)||typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature)||!secret)return false;
 return timingSafeEqual(createHmac('sha256',secret).update(body).digest(),Buffer.from(signature,'hex'));
}
export function createPaymentRouter(db,jwtSecret,config){
 const router=Router();
 router.use(authenticate(db,jwtSecret),requireRole('RESIDENT'));
 router.post('/orders',async(req,res)=>{
  if(!config.keyId?.startsWith('rzp_test_')||!config.keySecret||!config.webhookSecret)return res.status(503).json({error:'PAYMENTS_DISABLED'});
  const rentDueId=req.body?.rentDueId;
  if(typeof rentDueId!=='string'||!uuid.test(rentDueId))return res.status(400).json({error:'INVALID_INPUT'});
  let reservation;
  try{
   reservation=await db.$transaction(async tx=>{
    const due=await tx.rentDue.findFirst({where:{id:rentDueId,residentId:req.user.id},include:{payments:true,paymentOrder:true}});
    if(!due)return {error:'NOT_FOUND',status:404};
    const amountPaise=due.amountPaise-due.payments.reduce((n,p)=>n+p.amountPaise,0);
    if(amountPaise<=0)return {error:'ALREADY_PAID',status:409};
    if(due.paymentOrder)return due.paymentOrder.providerOrderId&&!due.paymentOrder.capturedAt&&due.paymentOrder.amountPaise===amountPaise?{order:due.paymentOrder,existing:true}:{error:'ORDER_REQUIRES_RECONCILIATION',status:409};
    return {order:await tx.paymentOrder.create({data:{rentDueId,amountPaise}})};
   },{isolationLevel:'Serializable'});
  }catch(err){if(['P2002','P2034'].includes(err.code))return res.status(409).json({error:'ORDER_CONFLICT_RETRY'});throw err;}
  if(reservation.error)return res.status(reservation.status).json({error:reservation.error});
  let order=reservation.order;
  if(!reservation.existing){
   // Never retry ambiguous provider failures automatically: the reservation blocks duplicate charges.
   const response=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(config.keyId+':'+config.keySecret).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify({amount:order.amountPaise,currency:'INR',receipt:order.id}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)return res.status(502).json({error:'ORDER_REQUIRES_RECONCILIATION'});
   const remote=await response.json();
   if(typeof remote.id!=='string'||remote.amount!==order.amountPaise||remote.currency!=='INR')return res.status(502).json({error:'ORDER_REQUIRES_RECONCILIATION'});
   order=await db.paymentOrder.update({where:{id:order.id},data:{providerOrderId:remote.id}});
  }
  return res.status(200).json({orderId:order.providerOrderId,amountPaise:order.amountPaise,currency:'INR',keyId:config.keyId});
 });
 return router;
}
export function paymentWebhook(db,config){
 return [raw({type:'application/json',limit:'100kb'}),async(req,res)=>{
  if(!config.keyId?.startsWith('rzp_test_')||!config.webhookSecret)return res.status(503).end();
  if(!verifyWebhook(req.body,req.get('x-razorpay-signature'),config.webhookSecret))return res.status(401).end();
  let event;try{event=JSON.parse(req.body.toString('utf8'));}catch{return res.status(400).end();}
  if(event.event!=='payment.captured')return res.status(204).end();
  const p=event.payload?.payment?.entity;
  if(!p||p.status!=='captured'||p.currency!=='INR'||!Number.isInteger(p.amount)||p.amount<=0||typeof p.id!=='string'||typeof p.order_id!=='string')return res.status(400).end();
  try{
   const result=await db.$transaction(async tx=>{
    const order=await tx.paymentOrder.findUnique({where:{providerOrderId:p.order_id},include:{rentDue:{include:{payments:true}}}});
    if(!order||order.amountPaise!==p.amount)return false;
    const existing=await tx.rentPayment.findUnique({where:{reference:p.id}});
    if(existing)return existing.rentDueId===order.rentDueId&&existing.amountPaise===p.amount;
    if(order.capturedAt||order.rentDue.amountPaise-order.rentDue.payments.reduce((n,x)=>n+x.amountPaise,0)!==p.amount)return false;
    await tx.rentPayment.create({data:{rentDueId:order.rentDueId,amountPaise:p.amount,reference:p.id}});
    await tx.paymentOrder.update({where:{id:order.id},data:{capturedAt:new Date()}});
    return true;
   },{isolationLevel:'Serializable'});
   return res.status(result?204:409).end();
  }catch(err){if(['P2002','P2034'].includes(err.code))return res.status(503).end();throw err;}
 }];
}
