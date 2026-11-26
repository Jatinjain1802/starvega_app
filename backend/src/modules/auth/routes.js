import { Router } from 'express';
import { acceptInvitation } from './invitations.js';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { verifyPassword, hashPassword } from './password.js';
import { authenticate } from './middleware.js';

const digest = token => createHash('sha256').update(token).digest('hex');
const publicUser = ({ id, name, phone, role }) => ({ id, name, phone, role });
const invalid = res => res.status(401).json({ error: 'INVALID_CREDENTIALS' });
const validRefresh = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const newRefresh = () => randomBytes(32).toString('hex');
const expiry = () => new Date(Date.now() + 30 * 86400000);
const claims = { issuer: 'starvega-api', audience: 'starvega-mobile' };

export function createAuthRouter(db, secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must be at least 32 bytes');
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
  const access = (user, sid) => jwt.sign({ sid }, secret, { ...claims, subject: user.id, algorithm: 'HS256', expiresIn: '15m' });
  const respond = (res, user, sid, refreshToken) => res.set('Cache-Control', 'no-store').json({ user: publicUser(user), accessToken: access(user, sid), refreshToken });
  router.post('/invitations/accept', limiter, acceptInvitation(db));
  router.post('/login', limiter, async (req, res) => {
    const { phone, password } = req.body ?? {};
    if (typeof phone !== 'string' || !/^\+91[6-9]\d{9}$/.test(phone) || typeof password !== 'string' || password.length > 128) return res.status(400).json({ error: 'INVALID_INPUT' });
    const user = await db.user.findUnique({ where: { phone } });
    const dummy = '0'.repeat(32) + ':' + '0'.repeat(128);
    const verified = await verifyPassword(password, user?.passwordHash ?? dummy);
    if (!verified || !user?.active) return invalid(res);
    const refreshToken = newRefresh();
    const session = await db.$transaction(async tx => {
      // Lock the same account row used by password changes before issuing a session.
      const rows = await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid AND "passwordHash" = ${user.passwordHash} AND active = true FOR UPDATE`;
      if (!rows.length) return null;
      return tx.session.create({ data: { userId: user.id, tokenHash: digest(refreshToken), expiresAt: expiry() } });
    });
    if (!session) return invalid(res);
    return respond(res, user, session.id, refreshToken);
  });
  router.post('/refresh', limiter, async (req, res) => {
    const token = req.body?.refreshToken;
    if (!validRefresh(token)) return invalid(res);
    const tokenHash = digest(token);
    const refreshToken = newRefresh();
    const result = await db.$transaction(async tx => {
      const session = await tx.session.findUnique({ where: { tokenHash }, include: { user: true } });
      if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;
      const changed = await tx.session.updateMany({ where: { id: session.id, tokenHash, revokedAt: null, expiresAt: { gt: new Date() } }, data: { tokenHash: digest(refreshToken) } });
      return changed.count === 1 ? session : null;
    });
    if (!result) return invalid(res);
    return respond(res, result.user, result.id, refreshToken);
  });
  router.post('/logout', limiter, async (req, res) => {
    const token = req.body?.refreshToken;
    if (!validRefresh(token)) return res.status(400).json({ error: 'INVALID_INPUT' });
    await db.session.updateMany({ where: { tokenHash: digest(token), revokedAt: null }, data: { revokedAt: new Date() } });
    return res.status(204).end();
  });
  router.post('/password', limiter, authenticate(db,secret), async (req,res)=>{
    const {currentPassword,newPassword}=req.body??{};
    if(typeof currentPassword!=='string'||currentPassword.length>128||typeof newPassword!=='string'||newPassword.length<12||newPassword.length>128||currentPassword===newPassword)return res.status(400).json({error:'INVALID_INPUT'});
    const user=await db.user.findUnique({where:{id:req.user.id}});
    if(!user?.active||!await verifyPassword(currentPassword,user.passwordHash))return res.status(403).json({error:'INCORRECT_PASSWORD'});
    const passwordHash=await hashPassword(newPassword);
    const changed=await db.$transaction(async tx=>{
      const result=await tx.user.updateMany({where:{id:user.id,active:true,passwordHash:user.passwordHash},data:{passwordHash}});
      if(!result.count)return false;
      await tx.session.updateMany({where:{userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});
      return true;
    });
    return changed?res.status(204).end():res.status(409).json({error:'ACCOUNT_CHANGED'});
  });
  router.get('/me', async (req, res) => {
    const token = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '')?.[1];
    if (!token) return invalid(res);
    let payload;
    try { payload = jwt.verify(token, secret, { ...claims, algorithms: ['HS256'] }); } catch { return invalid(res); }
    const session = await db.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return invalid(res);
    return res.set('Cache-Control', 'no-store').json({ user: publicUser(session.user) });
  });
  return router;
}
