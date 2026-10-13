import { dataError } from '../firebase/access.js';

export const CATEGORIES = ['motorcycle', 'car', 'moped', 'scooter', 'atv-utv', 'off-road', 'snowmobile', 'caravan', 'bicycle', 'e-bike', 'e-scooter', 'other'];
export const ACTIVITY_CATEGORIES = [...CATEGORIES, 'open'];
export const THEMES = ['normal', 'monochrome', 'forest', 'urban', 'night'];
export const ROLES = ['owner', 'admin', 'host', 'member'];
export const MEMBERSHIP_POLICIES = ['open', 'approval', 'invite', 'private'];
export const LINK_KEYS = ['website', 'whatsapp', 'discord', 'instagram', 'facebook'];
export const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
export function text(value, max, required = false) {
  if (typeof value !== 'string') throw dataError('invalid-input');
  const result = value.trim();
  if (result.length > max || (required && !result)) throw dataError('invalid-input');
  return result;
}
export function enumValue(value, choices) {
  if (!choices.includes(value)) throw dataError('invalid-input');
  return value;
}
export function safeURL(value) {
  if (!value) return null;
  if (typeof value !== 'string' || value.length > 500) throw dataError('invalid-input');
  let url;
  try { url = new URL(value); } catch { throw dataError('invalid-input'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.href.length > 500) throw dataError('invalid-input');
  return url.href;
}
export function color(value, optional = false) {
  if (optional && (value == null || value === '')) return null;
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw dataError('invalid-input');
  return value.toLowerCase();
}
export function vehicleInput(value) {
  const year = value.modelYear === '' || value.modelYear == null ? null : Number(value.modelYear);
  if (year !== null && (!Number.isInteger(year) || year < 1885 || year > new Date().getFullYear() + 1)) throw dataError('invalid-input');
  return { category: enumValue(value.category, CATEGORIES), nickname: text(value.nickname, 64, true),
    manufacturer: text(value.manufacturer || '', 64), model: text(value.model || '', 64),
    modelYear: year, description: text(value.description || '', 1000),
    visibility: enumValue(value.visibility || 'private', ['private', 'club', 'public']) };
}
export function vehicleSnapshot(vehicle) {
  return vehicle ? { nickname: vehicle.nickname, manufacturer: vehicle.manufacturer,
    model: vehicle.model, category: vehicle.category } : null;
}
export function clubInput(value) {
  const visibility = enumValue(value.visibility, ['public', 'unlisted', 'private']);
  const membershipPolicy = enumValue(value.membershipPolicy, MEMBERSHIP_POLICIES);
  if ((membershipPolicy === 'private' && visibility !== 'private')
    || (visibility === 'private' && ['open', 'approval'].includes(membershipPolicy))) throw dataError('invalid-input');
  const links = Object.fromEntries(LINK_KEYS.map(key => [key, safeURL(value.links?.[key])]));
  return { name: text(value.name, 80, true), description: text(value.description || '', 2000),
    category: enumValue(value.category, ACTIVITY_CATEGORIES), visibility, membershipPolicy,
    primaryColor: color(value.primaryColor), accentColor: color(value.accentColor),
    routeColor: color(value.routeColor, true), mapTheme: enumValue(value.mapTheme || 'normal', THEMES), links };
}
