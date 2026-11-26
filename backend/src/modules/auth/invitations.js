import { randomBytes, createHash } from 'node:crypto';
import { hashPassword } from './password.js';
import { propertyScope } from '../properties/access.js';
const digest = token => createHash('sha256').update(token).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class InvitationError extends Error { constructor(code,status=409){super(code);this.code=code;this.status=status;} }
const transaction = (db,fn)=>db.$transaction(fn,{isolationLevel:'Serializable'});
function handle(err,res){
 if(err instanceof InvitationError)return res.status(err.status).json({error:err.code});
 if(['P2002','P2034'].includes(err.code))return res.status(409).json({error:'INVITATION_CONFLICT'});
 throw err;
}
export function issueInvitation(db){
 return async(req,res)=>{
  const {phone,role,bedId}=req.body??{};
  if(typeof phone!=='string'||!/^\+91[6-9]\d{9}$/.test(phone)||!['MANAGER','RESIDENT'].includes(role)||(role==='RESIDENT'&&(typeof bedId!=='string'||!uuid.test(bedId)))||(role==='MANAGER'&&bedId!=null))return res.status(400).json({error:'INVALID_INPUT'});
  if(role==='MANAGER'&&req.user.role!=='OWNER')return res.status(403).json({error:'FORBIDDEN'});
  const token=randomBytes(32).toString('hex');
  try {
   const invitation=await transaction(db,async tx=>{
    const property=await tx.property.findFirst({where:{AND:[{id:req.params.id},propertyScope(req.user)]},select:{id:true}});
    if(!property)throw new InvitationError('NOT_FOUND',404);
    if(role==='RESIDENT'&&!await tx.bed.findFirst({where:{id:bedId,room:{propertyId:property.id},allocations:{none:{endedAt:null}}},select:{id:true}}))throw new InvitationError('BED_UNAVAILABLE');
    return tx.invitation.create({data:{propertyId:property.id,inviterId:req.user.id,bedId:bedId??null,phone,role,tokenHash:digest(token),expiresAt:new Date(Date.now()+86400000)},select:{id:true,expiresAt:true}});
   });
   return res.status(201).set('Cache-Control','no-store').json({invitation,token});
  }catch(err){return handle(err,res);}
 };
}
export function acceptInvitation(db){
 return async(req,res)=>{
  const {token,phone,name,password}=req.body??{};
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||typeof phone!=='string'||!/^\+91[6-9]\d{9}$/.test(phone)||typeof name!=='string'||!name.trim()||name.trim().length>120||typeof password!=='string'||password.length<12||password.length>128)return res.status(400).json({error:'INVALID_INPUT'});
  const passwordHash=await hashPassword(password);
  try{
   const user=await transaction(db,async tx=>{
    const invite=await tx.invitation.findUnique({where:{tokenHash:digest(token)},include:{inviter:true}});
    if(!invite||invite.phone!==phone||invite.acceptedAt||invite.expiresAt<=new Date()||!invite.inviter.active||!['MANAGER','RESIDENT'].includes(invite.role))throw new InvitationError('INVALID_INVITATION',400);
    if(invite.role==='MANAGER'&&invite.inviter.role!=='OWNER')throw new InvitationError('INVALID_INVITATION',400);
    if(!await tx.property.findFirst({where:{AND:[{id:invite.propertyId},propertyScope(invite.inviter)]},select:{id:true}}))throw new InvitationError('INVALID_INVITATION',400);
    if(await tx.user.findUnique({where:{phone},select:{id:true}}))throw new InvitationError('ACCOUNT_EXISTS');
    if(invite.role==='RESIDENT'&&!await tx.bed.findFirst({where:{id:invite.bedId,room:{propertyId:invite.propertyId},allocations:{none:{endedAt:null}}},select:{id:true}}))throw new InvitationError('BED_UNAVAILABLE');
    const consumed=await tx.invitation.updateMany({where:{id:invite.id,acceptedAt:null,expiresAt:{gt:new Date()}},data:{acceptedAt:new Date()}});
    if(consumed.count!==1)throw new InvitationError('INVALID_INVITATION',400);
    const user=await tx.user.create({data:{phone,name:name.trim(),passwordHash,role:invite.role},select:{id:true,name:true,phone:true,role:true}});
    if(invite.role==='MANAGER')await tx.managerAssignment.create({data:{propertyId:invite.propertyId,managerId:user.id}});
    else await tx.allocation.create({data:{bedId:invite.bedId,residentId:user.id}});
    return user;
   });
   return res.status(201).set('Cache-Control','no-store').json({user});
  }catch(err){return handle(err,res);}
 };
}
