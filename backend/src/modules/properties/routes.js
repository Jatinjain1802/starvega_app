import { Router } from 'express';
import { createAnnouncementRouter } from './announcements.js';
import { createComplaintRouter } from './complaints.js';
import { createRentRouter } from './rent.js';
import { createPeopleRouter } from './people.js';
import { createRoomRouter } from './rooms.js';
import { authenticate, requireRole } from '../auth/middleware.js';
import { propertyScope } from './access.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const select = {id:true,name:true,address:true};
const valid = (s,max) => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= max;
export function createPropertyRouter(db, secret) {
  const router = Router();
  router.use(authenticate(db,secret));
  router.use('/:id/complaints',createComplaintRouter(db));
  router.use('/:id/announcements',createAnnouncementRouter(db));
  router.use('/:id/rooms',createRoomRouter(db));
  router.use('/:id/people',createPeopleRouter(db));
  router.use('/:id/rent',createRentRouter(db));
  router.get('/',async (req,res) => {
    const cursor = req.query.cursor;
    if (cursor !== undefined && (typeof cursor !== 'string' || !uuid.test(cursor))) return res.status(400).json({error:'INVALID_CURSOR'});
    const rows = await db.property.findMany({where:{AND:[propertyScope(req.user),...(cursor?[{id:{gt:cursor}}]:[])]},select,orderBy:{id:'asc'},take:51});
    return res.json({items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null});
  });
  router.post('/',requireRole('OWNER'),async (req,res) => {
    const {name,address} = req.body ?? {};
    if (!valid(name,120)||!valid(address,500)) return res.status(400).json({error:'INVALID_INPUT'});
    const property = await db.property.create({data:{name:name.trim(),address:address.trim(),ownerId:req.user.id},select});
    return res.status(201).json({property});
  });
  router.get('/:id',async (req,res) => {
    if (!uuid.test(req.params.id)) return res.status(400).json({error:'INVALID_ID'});
    const property = await db.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select});
    return property?res.json({property}):res.status(404).json({error:'NOT_FOUND'});
  });
  router.patch('/:id',requireRole('OWNER'),async (req,res) => {
    if (!uuid.test(req.params.id)) return res.status(400).json({error:'INVALID_ID'});
    const {name,address} = req.body ?? {};
    if ((name===undefined && address===undefined)||(name!==undefined&&!valid(name,120))||(address!==undefined&&!valid(address,500))) return res.status(400).json({error:'INVALID_INPUT'});
    const data = {...(name!==undefined?{name:name.trim()}:{}),...(address!==undefined?{address:address.trim()}:{})};
    const result = await db.property.updateMany({where:{id:req.params.id,ownerId:req.user.id},data});
    return result.count?res.status(204).end():res.status(404).json({error:'NOT_FOUND'});
  });
  return router;
}
