import { CATEGORIES, enumValue, text, validId } from './schema.js';
import { dataError } from '../firebase/access.js';

export const ACTIVITIES = ['ride', 'drive', 'meet', 'event'];
export const GROUP_STATES = ['scheduled', 'active', 'completed', 'cancelled'];
export const GROUP_VISIBILITIES = ['public', 'approval', 'unlisted', 'private'];
export const JOIN_POLICIES = ['open', 'approval', 'invite'];
export const RIDER_STATUSES = ['ok', 'fuel', 'mechanical', 'help'];
export const GROUP_PAGE_FIELDS = ['id', 'title', 'description', 'activityType', 'category', 'clubId', 'clubName',
  'hostName', 'startsAt', 'endsAt', 'meetingArea', 'visibility', 'joiningPolicy', 'maxParticipants',
  'state', 'participantCount', 'updatedAt'];
export function groupPage(group) {
  return Object.fromEntries(GROUP_PAGE_FIELDS.map(key => [key, group[key]]));
}
export const lobbyEligible = group => ['public', 'approval'].includes(group.visibility) && ['scheduled', 'active'].includes(group.state);
export function groupInput(input) {
  const startsAt = Number(input.startsAt), endsAt = input.endsAt ? Number(input.endsAt) : null;
  const maxParticipants = input.maxParticipants ? Number(input.maxParticipants) : null;
  if (!Number.isSafeInteger(startsAt) || startsAt <= 0 || startsAt >= 4102444800000
    || (endsAt !== null && (!Number.isSafeInteger(endsAt) || endsAt < startsAt || endsAt >= 4102444800000))
    || (maxParticipants !== null && (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 50))
    || (input.clubId && !validId(input.clubId))) throw dataError('invalid-input');
  const visibility = enumValue(input.visibility, GROUP_VISIBILITIES), joiningPolicy = enumValue(input.joiningPolicy, JOIN_POLICIES);
  if ((visibility === 'approval' && joiningPolicy !== 'approval')
    || (visibility === 'private' && joiningPolicy !== 'invite')) throw dataError('invalid-input');
  return {title: text(input.title, 80, true), description: text(input.description || '', 2000),
    activityType: enumValue(input.activityType, ACTIVITIES), category: enumValue(input.category, CATEGORIES),
    clubId: input.clubId || null, startsAt, endsAt, meetingArea: text(input.meetingArea, 80, true),
    meetingLocation: text(input.meetingLocation || '', 500), visibility, joiningPolicy, maxParticipants};
}
export function sessionURL(id, token = null) {
  if (!validId(id) || (token && !validId(token))) throw dataError('invalid-input');
  const url = new URL('./', document.baseURI);
  url.hash = '/session/' + id + (token ? '/invite/' + token : '');
  return url.href;
}
