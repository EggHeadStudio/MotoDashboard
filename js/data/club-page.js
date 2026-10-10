// Public presentation only. Never spread canonical Club authorization into a page.
export const CLUB_PAGE_FIELDS = Object.freeze([
  'id', 'name', 'description', 'category', 'visibility', 'membershipPolicy',
  'primaryColor', 'accentColor', 'routeColor', 'mapTheme', 'links',
  'state', 'memberCount', 'updatedAt'
]);
export function clubPage(club) {
  return Object.fromEntries(CLUB_PAGE_FIELDS.map(key => [key, club[key]]));
}
