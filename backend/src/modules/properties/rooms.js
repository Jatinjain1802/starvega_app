import { Router } from 'express';
import { requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roomSelect = {id:true,label:true,beds:{select:{id:true,label:true,allocations:{where:{endedAt:null},select:{id:true},take:1}},orderBy:{label:'asc'}}};
export function summarizeRooms(rooms) {
  const items = rooms.map(room => ({id:room.id,label:room.label,beds:room.beds.map(bed=>({id:bed.id,label:bed.label,occupied:bed.allocations.length>0}))}));
  const totalBeds = items.reduce((n,r)=>n+r.beds.length,0);
  const occupiedBeds = items.reduce((n,r)=>n+r.beds.filter(b=>b.occupied).length,0);
  const occupiedRooms = items.filter(r=>r.beds.some(b=>b.occupied)).length;
  return {items,occupancy:{totalRooms:items.length,occupiedRooms,vacantRooms:items.length-occupiedRooms,totalBeds,occupiedBeds,vacantBeds:totalBeds-occupiedBeds}};
}
export function createRoomRouter(db) {
  const router = Router({mergeParams:true});
  router.use(requireRole('OWNER','MANAGER'));
  router.use(async (req,res,next)=>{
    if (!uuid.test(req.params.id)) return res.status(400).json({error:'INVALID_ID'});
    const property=await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}});
    if (!property) return res.status(404).json({error:'NOT_FOUND'});
    next();
  });
  router.get('/',async(req,res)=>{
    const rooms=await db.room.findMany({where:{propertyId:req.params.id,property:propertyScope(req.user)},select:roomSelect,orderBy:{label:'asc'}});
    res.json(summarizeRooms(rooms));
  });
  router.post('/',requireRole('OWNER'),async(req,res)=>{
    const {label,capacity}=req.body??{};
    if(typeof label!=='string'||!label.trim()||label.trim().length>80||!Number.isInteger(capacity)||capacity<1||capacity>20) return res.status(400).json({error:'INVALID_INPUT'});
    try {
      const room=await db.room.create({data:{property:{connect:{id:req.params.id,ownerId:req.user.id}},label:label.trim(),beds:{create:Array.from({length:capacity},(_,i)=>({label:String(i+1)}))}},select:roomSelect});
      return res.status(201).json({room:summarizeRooms([room]).items[0]});
    } catch(err) {
      if(err.code==='P2002') return res.status(409).json({error:'ROOM_LABEL_EXISTS'});
      if(err.code==='P2025') return res.status(404).json({error:'NOT_FOUND'});
      throw err;
    }
  });
  return router;
}
