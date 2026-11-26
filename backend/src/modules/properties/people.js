import { Router } from 'express';
import { issueInvitation } from '../auth/invitations.js';
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const person = {id:true,name:true,phone:true};
export function createPeopleRouter(db) {
 const router=Router({mergeParams:true});
 router.use(requireRole('OWNER','MANAGER'));
 router.use(async(req,res,next)=>{
   if(!uuid.test(req.params.id)) return res.status(400).json({error:'INVALID_ID'});
   if(!await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}})) return res.status(404).json({error:'NOT_FOUND'});
   next();
 });
 router.post('/invitations',issueInvitation(db));
 router.get('/managers',async(req,res)=>{
   const items=await db.managerAssignment.findMany({where:{propertyId:req.params.id,property:propertyScope(req.user)},select:{manager:{select:person}},orderBy:{managerId:'asc'}});
   res.json({items:items.map(x=>x.manager)});
 });
 router.get('/residents',async(req,res)=>{
   const items=await db.allocation.findMany({where:{endedAt:null,bed:{room:{propertyId:req.params.id,property:propertyScope(req.user)}}},select:{id:true,startedAt:true,resident:{select:person},bed:{select:{id:true,label:true,room:{select:{id:true,label:true}}}}},orderBy:{id:'asc'}});
   res.json({items});
 });
 router.delete('/managers/:managerId',requireRole('OWNER'),async(req,res)=>{
   if(!uuid.test(req.params.managerId)) return res.status(400).json({error:'INVALID_ID'});
   const result=await db.managerAssignment.deleteMany({where:{propertyId:req.params.id,managerId:req.params.managerId,property:{ownerId:req.user.id}}});
   return result.count?res.status(204).end():res.status(404).json({error:'NOT_FOUND'});
 });
 return router;
}
