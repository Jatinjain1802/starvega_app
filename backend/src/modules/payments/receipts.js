import { notify } from '../notifications/routes.js';
import { propertyScope } from '../properties/access.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const select={id:true,amountPaise:true,reference:true,method:true,paidAt:true,recordedById:true,rentDue:{select:{id:true,month:true,resident:{select:{id:true,name:true}},property:{select:{id:true,name:true,address:true}}}}};
export function receiptData(payment){
 return {...payment,receiptNumber:'SV-'+payment.id.toUpperCase(),currency:'INR'};
}
export function getReceipt(db,staff=false){
 return async(req,res)=>{
  if(!uuid.test(req.params.paymentId))return res.status(400).json({error:'INVALID_ID'});
  const scope=staff?{propertyId:req.params.id,property:propertyScope(req.user)}:{residentId:req.user.id};
  const payment=await db.rentPayment.findFirst({where:{id:req.params.paymentId,rentDue:scope},select});
  return payment?res.json({receipt:receiptData(payment)}):res.status(404).json({error:'NOT_FOUND'});
 };
}
export function recordOfflinePayment(db){
 return async(req,res)=>{
  const {rentDueId,amountPaise,method,idempotencyKey}=req.body??{};
  if(typeof rentDueId!=='string'||!uuid.test(rentDueId)||!Number.isInteger(amountPaise)||amountPaise<1||amountPaise>100000000||!['CASH','BANK_TRANSFER'].includes(method)||typeof idempotencyKey!=='string'||!uuid.test(idempotencyKey))return res.status(400).json({error:'INVALID_INPUT'});
  const reference='offline:'+idempotencyKey.toLowerCase();
  try{
   const result=await db.$transaction(async tx=>{
    const due=await tx.rentDue.findFirst({where:{id:rentDueId,propertyId:req.params.id,property:propertyScope(req.user)},include:{payments:true,paymentOrder:true}});
    if(!due)return {error:'NOT_FOUND',status:404};
    const existing=await tx.rentPayment.findUnique({where:{reference},select});
    if(existing){
     if(existing.rentDue.id!==due.id||existing.amountPaise!==amountPaise||existing.method!==method||existing.recordedById!==req.user.id)return {error:'IDEMPOTENCY_CONFLICT',status:409};
     return {payment:existing,replayed:true};
    }
    if(due.paymentOrder&&!due.paymentOrder.capturedAt)return {error:'ONLINE_ORDER_ACTIVE',status:409};
    const balance=due.amountPaise-due.payments.reduce((n,p)=>n+p.amountPaise,0);
    if(amountPaise>balance)return {error:'AMOUNT_EXCEEDS_BALANCE',status:409};
    const payment=await tx.rentPayment.create({data:{rentDueId,amountPaise,reference,method,recordedById:req.user.id},select});
    await notify(tx,[due.residentId],{kind:'PAYMENT',title:'Rent payment recorded',body:'A rent payment was recorded by your PG staff. Check your payment history.',dedupeKey:'payment:'+payment.id});
    return {payment,replayed:false};
   },{isolationLevel:'Serializable'});
   return result.error?res.status(result.status).json({error:result.error}):res.status(result.replayed?200:201).json({receipt:receiptData(result.payment)});
  }catch(err){if(['P2002','P2034'].includes(err.code))return res.status(409).json({error:'CONCURRENT_CHANGE_RETRY'});throw err;}
 };
}
