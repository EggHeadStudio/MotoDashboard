// Fixed deadline shared by presentation and repositories. Rules/Worker enforce server time.
export const GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;
export const EARLY_START_MS = 2 * 60 * 60 * 1000;
export function groupDeadline(group) {
  if(!Number.isSafeInteger(group?.startsAt)) return 0;
  return Math.min(group.startsAt + GROUP_WINDOW_MS, group.endsAt ?? Infinity);
}
export function effectiveGroup(group,now=Date.now()) {
  if(['scheduled','active'].includes(group.state) && (groupDeadline(group)<=now || (group.state==='active' && group.startsAt>now+EARLY_START_MS)))
    return {...group,state:group.state==='active'?'completed':'cancelled',expired:true};
  return group;
}
