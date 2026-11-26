import { Router } from 'express';
import { createHash } from 'node:crypto';
import multer from 'multer';
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:3*1024*1024,files:3,fields:1,fieldSize:100*1024,parts:4}}).array('receipts',3);
export function receiptType(b){
 if(b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255&&b[b.length-2]===255&&b[b.length-1]===217)return 'image/jpeg';
 if(b.length>=20&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.subarray(-12).equals(Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130])))return 'image/png';
 if(b.length>=12&&b.subarray(0,5).toString()==='%PDF-'&&b.subarray(-1024).toString().trimEnd().endsWith('%%EOF'))return 'application/pdf';
 return null;
}
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories=['GROCERY','MAINTENANCE','ELECTRICITY','WATER','SALARY','RENT','INTERNET','CLEANING','OTHER'];
const valid=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
const select={id:true,category:true,description:true,vendor:true,paymentMethod:true,incurredAt:true,totalPaise:true,createdAt:true,receipts:{select:{id:true,contentType:true,sizeBytes:true,createdAt:true}},author:{select:{id:true,name:true}},items:{select:{id:true,name:true,unit:true,quantityMilli:true,unitPricePaise:true,totalPaise:true}}};
export function calculateItems(items){
 if(!Array.isArray(items)||items.length<1||items.length>100)return null;
 const rows=[];
 for(const item of items){
  if(!item||!valid(item.name,120)||!valid(item.unit,30)||!Number.isInteger(item.quantityMilli)||item.quantityMilli<1||item.quantityMilli>1000000||!Number.isInteger(item.unitPricePaise)||item.unitPricePaise<1||item.unitPricePaise>100000000)return null;
  const totalPaise=Math.round(item.quantityMilli*item.unitPricePaise/1000);
  if(totalPaise<1||totalPaise>100000000)return null;
  rows.push({name:item.name.trim(),unit:item.unit.trim(),quantityMilli:item.quantityMilli,unitPricePaise:item.unitPricePaise,totalPaise});
 }
 const totalPaise=rows.reduce((n,x)=>n+x.totalPaise,0);
 return totalPaise<=100000000?{rows,totalPaise}:null;
}
export function createExpenseRouter(db){
 const router=Router({mergeParams:true});
 router.use(requireRole('OWNER','MANAGER'));
 const scope=req=>({propertyId:req.params.id,property:propertyScope(req.user)});
 router.use(async(req,res,next)=>{
  if(!uuid.test(req.params.id))return res.status(400).json({error:'INVALID_ID'});
  if(!await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}}))return res.status(404).json({error:'NOT_FOUND'});
  next();
 });
 router.post('/',requireRole('MANAGER'),(req,res,next)=>upload(req,res,err=>err?res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({error:'INVALID_UPLOAD'}):next()),async(req,res)=>{
  if(!req.files?.length)return res.status(400).json({error:'RECEIPT_REQUIRED'});
  const receipts=req.files.map(f=>({contentType:receiptType(f.buffer),sizeBytes:f.size,sha256:createHash('sha256').update(f.buffer).digest('hex'),data:f.buffer}));
  if(receipts.some(r=>!r.contentType))return res.status(400).json({error:'INVALID_RECEIPT_TYPE'});
  let payload;try{payload=JSON.parse(req.body?.expense??'');}catch{return res.status(400).json({error:'INVALID_INPUT'});}
  const {category,description,vendor,paymentMethod,incurredAt,requestKey,items}=payload??{};
  const calculated=calculateItems(items);
  const when=typeof incurredAt==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(incurredAt)?new Date(incurredAt):null;
  if(!categories.includes(category)||!valid(description,500)||(vendor!=null&&!valid(vendor,120))||!['CASH','UPI','BANK_TRANSFER','CARD','OTHER'].includes(paymentMethod)||!when||!Number.isFinite(when.getTime())||when>new Date()||typeof requestKey!=='string'||!uuid.test(requestKey)||!calculated)return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const expense=await db.expense.create({data:{property:{connect:{id:req.params.id,...propertyScope(req.user)}},author:{connect:{id:req.user.id}},category,description:description.trim(),vendor:vendor?.trim()??null,paymentMethod,incurredAt:when,requestKey:requestKey.toLowerCase(),totalPaise:calculated.totalPaise,items:{create:calculated.rows},receipts:{create:receipts}},select});
   return res.status(201).json({expense});
  }catch(err){if(err.code==='P2002')return res.status(409).json({error:'DUPLICATE_REQUEST'});if(err.code==='P2025')return res.status(404).json({error:'NOT_FOUND'});throw err;}
 });
 router.get('/',async(req,res)=>{
  const {cursor,category}=req.query;
  if((cursor!==undefined&&(typeof cursor!=='string'||!uuid.test(cursor)))||(category!==undefined&&!categories.includes(category)))return res.status(400).json({error:'INVALID_INPUT'});
  const rows=await db.expense.findMany({where:{...scope(req),...(cursor?{id:{gt:cursor}}:{}),...(category?{category}:{})},select,orderBy:{id:'asc'},take:51});
  return res.json({items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null});
 });
 router.get('/summary',async(req,res)=>{
  const month=req.query.month;
  if(typeof month!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return res.status(400).json({error:'INVALID_MONTH'});
  const [y,m]=month.split('-').map(Number);
  const start=new Date(Date.UTC(y,m-1,1)-19800000);
  const end=new Date(Date.UTC(y,m,1)-19800000);
  const rows=await db.expense.groupBy({by:['category'],where:{...scope(req),incurredAt:{gte:start,lt:end}},_sum:{totalPaise:true},_count:{_all:true}});
  const categories=rows.map(x=>({category:x.category,totalPaise:x._sum.totalPaise??0,count:x._count._all}));
  return res.json({month,totalPaise:categories.reduce((n,x)=>n+x.totalPaise,0),categories});
 });
 router.get('/:expenseId/receipts/:receiptId',async(req,res)=>{
  if(!uuid.test(req.params.expenseId)||!uuid.test(req.params.receiptId))return res.status(400).json({error:'INVALID_ID'});
  const receipt=await db.expenseReceipt.findFirst({where:{id:req.params.receiptId,expenseId:req.params.expenseId,expense:scope(req)},select:{data:true,contentType:true}});
  if(!receipt)return res.status(404).json({error:'NOT_FOUND'});
  const ext={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'}[receipt.contentType];
  return res.set({'Content-Type':receipt.contentType,'Content-Disposition':'attachment; filename="receipt.'+ext+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(Buffer.from(receipt.data));
 });
 router.get('/:expenseId',async(req,res)=>{
  if(!uuid.test(req.params.expenseId))return res.status(400).json({error:'INVALID_ID'});
  const expense=await db.expense.findFirst({where:{id:req.params.expenseId,...scope(req)},select});
  return expense?res.json({expense}):res.status(404).json({error:'NOT_FOUND'});
 });
 return router;
}
