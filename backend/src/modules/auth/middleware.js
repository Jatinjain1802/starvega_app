import jwt from 'jsonwebtoken';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function authenticate(db, secret) {
  return async (req, res, next) => {
    const deny = () => res.status(401).json({error:'UNAUTHORIZED'});
    const token = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '')?.[1];
    if (!token) return deny();
    let claims;
    try { claims = jwt.verify(token, secret, {issuer:'starvega-api',audience:'starvega-mobile',algorithms:['HS256']}); } catch { return deny(); }
    if (!uuid.test(claims?.sid ?? '') || !uuid.test(claims?.sub ?? '')) return deny();
    const session = await db.session.findUnique({where:{id:claims.sid},include:{user:{select:{id:true,role:true,active:true}}}});
    if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return deny();
    req.user = session.user;
    res.set('Cache-Control','no-store');
    next();
  };
}
export const requireRole = (...roles) => (req,res,next) => roles.includes(req.user?.role) ? next() : res.status(403).json({error:'FORBIDDEN'});
