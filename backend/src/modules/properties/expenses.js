import { Router } from 'express';
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories=['GROCERY','MAINTENANCE','ELECTRICITY','WATER','SALARY','RENT','INTERNET','CLEANING','OTHER'];
const valid=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
const select={id:true,category:true,description:true,vendor:true,paymentMethod:true,incurredAt:true,totalPaise:true,createdAt:true,author:{select:{id:true,name:true}},items:{select:{id:true,name:true,unit:true,quantityMilli:true,unitPricePaise:true,totalPaise:true}}};
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
 router.post('/',requireRole('MANAGER'),async(req,res)=>{
  // Fail closed until verified, privately stored mandatory receipt uploads are implemented.
  return res.status(503).json({error:'RECEIPT_UPLOAD_NOT_AVAILABLE'});
  const {category,description,vendor,paymentMethod,incurredAt,requestKey,items}=req.body??{};
  const calculated=calculateItems(items);
  const when=typeof incurredAt==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(incurredAt)?new Date(incurredAt):null;
  if(!categories.includes(category)||!valid(description,500)||(vendor!=null&&!valid(vendor,120))||!['CASH','UPI','BANK_TRANSFER','CARD','OTHER'].includes(paymentMethod)||!when||!Number.isFinite(when.getTime())||when>new Date()||typeof requestKey!=='string'||!uuid.test(requestKey)||!calculated)return res.status(400).json({error:'INVALID_INPUT'});
  try{
   const expense=await db.expense.create({data:{property:{connect:{id:req.params.id,...propertyScope(req.user)}},author:{connect:{id:req.user.id}},category,description:description.trim(),vendor:vendor?.trim()??null,paymentMethod,incurredAt:when,requestKey:requestKey.toLowerCase(),totalPaise:calculated.totalPaise,items:{create:calculated.rows}},select});
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
 router.get('/:expenseId',async(req,res)=>{
  if(!uuid.test(req.params.expenseId))return res.status(400).json({error:'INVALID_ID'});
  const expense=await db.expense.findFirst({where:{id:req.params.expenseId,...scope(req)},select});
  return expense?res.json({expense}):res.status(404).json({error:'NOT_FOUND'});
 });
 return router;
}
