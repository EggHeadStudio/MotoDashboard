// Visible rank names never participate in authorization. Canonical owner UID wins.
export function roleFor(club, membership, uid) {
  if (!uid) return null;
  if (club?.ownerUid === uid) return 'owner';
  return membership?.uid === uid ? membership.technicalRole : null;
}
export const isManager = role => ['owner', 'admin'].includes(role);
export function canManageMember(role, actorUid, target, nextRole = target.technicalRole) {
  if (role === 'owner') return target.uid === actorUid ? nextRole === 'owner' : nextRole !== 'owner';
  return role === 'admin' && target.uid !== actorUid
    && ['host', 'member'].includes(target.technicalRole) && ['host', 'member'].includes(nextRole);
}
export const canBrand = isManager;
export function canAssignRank(role,actorUid,target) {
  return canManageMember(role,actorUid,target) || (role==='admin' && target.uid===actorUid);
}
