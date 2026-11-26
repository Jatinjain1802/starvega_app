// Use only with a freshly authenticated, active user loaded from the database.
export function propertyScope(user) {
  if (!user?.active || !user.id) throw new Error('Unauthorized');
  switch (user.role) {
    case 'OWNER': return { ownerId: user.id };
    case 'MANAGER': return { managers: { some: { managerId: user.id } } };
    case 'RESIDENT': return { rooms: { some: { beds: { some: { allocations: { some: { residentId: user.id, endedAt: null } } } } } } };
    default: throw new Error('Unauthorized');
  }
}
export async function canAccessProperty(db, user, propertyId) {
  return Boolean(await db.property.findFirst({ where: { AND: [{ id: propertyId }, propertyScope(user)] }, select: { id: true } }));
}
