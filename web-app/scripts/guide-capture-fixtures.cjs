/* Documentation-only responses. Never mounted in the application or connected
 * to a database. The capture server refuses unrecognised requests. */
const permissions = ['READ_USER', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
  'READ_EVENT', 'CREATE_EVENT', 'UPDATE_EVENT', 'DELETE_EVENT',
  'READ_TEAM', 'CREATE_TEAM', 'UPDATE_TEAM', 'DELETE_TEAM',
  'READ_LAYER', 'CREATE_LAYER', 'UPDATE_LAYER', 'DELETE_LAYER',
  'READ_DEVICE', 'CREATE_DEVICE', 'UPDATE_DEVICE', 'DELETE_DEVICE',
  'READ_ROLE', 'READ_FEED', 'CREATE_FEED', 'UPDATE_FEED', 'DELETE_FEED',
  'CREATE_OBSERVATION', 'UPDATE_OBSERVATION', 'DELETE_OBSERVATION', 'UPDATE_SETTINGS'];
const role = { id: 1, name: 'ADMIN_ROLE', description: 'Administrator', permissions };
const user = { id: 'guide-user', username: 'example.user', displayName: 'Example User',
  active: true, enabled: true, role, email: 'example@example.invalid',
  authentication: { type: 'local', id: 'local', authenticationConfiguration: { title: 'MAGE Username/Password' } },
  recentEventIds: [1], phones: [] };
const form = { id: 1, name: 'Training report', description: 'Fictional training form',
  color: '#0060a8', archived: false, default: true, fields: [
    { id: 1, name: 'field1', title: 'Report title', type: 'textfield', required: true },
    { id: 2, name: 'field2', title: 'Photos', type: 'attachment', required: false },
    { id: 3, name: 'field3', title: 'Status', type: 'dropdown', required: false,
      choices: [{ id: 1, title: 'Open' }, { id: 2, title: 'Closed' }] }
  ] };
form.primaryField = 'field3';
const osm = { id: 1, name: 'OpenStreetMap', type: 'Imagery', format: 'XYZ',
  base: true, url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' };
const medical = { id: 2, name: 'Training medical', type: 'GeoPackage',
  tables: [{ name: 'osm_features', type: 'feature', bbox: [-90.6, 38.4, -90.1, 38.8] }] };
const hospitals = { ...medical, id: 3, name: 'Training hospitals' };
const event = { id: 1, name: 'Training Event', description: 'Fictional training event',
  complete: false, forms: [form], layers: [osm, medical, hospitals], teams: [{ id: 1, name: 'Training Team', userIds: [user.id] }], feedIds: [], acl: {},
  style: {}, permissions };
const page = { items: [user], users: [user], totalCount: 1, total: 1, next: null, prev: null };
function response(url, method = 'GET') {
  const p = url.pathname.replace(/\/$/, '') || '/';
  if (!['GET', 'HEAD'].includes(method)) {
    // These POSTs are read queries, never persisted.
    if (p.endsWith('/observations/search')) return [];
    throw new Error(`Unapproved documentation request: ${method} ${p}`);
  }
  if (p === '/api') return { version: '6.7.1', authenticationStrategies: {}, initial: false };
  if (p === '/api/users/myself' || p === '/api/users/guide-user') return user;
  if (p === '/api/settings/banner') return { settings: { showHeader: false, showFooter: false } };
  if (p === '/api/settings/map') return { webSearchType: 'NONE', baseLayers: [] };
  if (p === '/api/user-guide/customizations' || p === '/api/user-guide/events/1') return { revision: 0, overrides: {} };
  if (p === '/api/layers') return [osm];
  if (p === '/api/events/1/layers') return event.layers;
  if (p === '/api/layers/1' || p === '/api/events/1/layers/1') return osm;
  if (p === '/api/exports/mine') return [];
  if (p === '/api/logins') return { items: [], totalCount: 0, links: {} };
  if (p === '/api/events') return url.searchParams.get('includePagination') === 'true' ? { items: [event], totalCount: 1 } : [event];
  if (p === '/api/events/1') return event;
  if (p === '/api/events/1/form/1' || p === '/api/events/1/forms/1') return form;
  if (p === '/api/events/1/icons/1.json') return {};
  if (p === '/api/roles') return [role, { id: 2, name: 'USER_ROLE', permissions: ['CREATE_OBSERVATION'] }];
  if (p === '/api/users' || p === '/api/next-users/search') return page;
  if (p === '/api/users/count') return { count: 1 };
  if (p === '/api/my/preferences/events/1') return {};
  if (p === '/api/events/1/members') return page;
  if (p === '/api/events/1/members/page') return page;
  if (p === '/api/next-teams/search' || p === '/api/events/1/teams') return { items: [], totalCount: 0, links: {} };
  if (/^\/api\/events\/1\/observations(?:\/map|\/count)?$/.test(p)) {
    return p.endsWith('/count') ? { count: 0 } :
      url.searchParams.has('page_size') ? { items: [], totalCount: 0 } : [];
  }
  if (/^\/api\/(?:teams|layers|devices|feeds|feeds\/services|feeds\/service_types)$/.test(p) ||
      /^\/api\/events\/1\/(?:teams|layers|feeds|locations|users\/locations|locations\/users)$/.test(p) ||
      /^\/api\/users\/guide-user\/(?:teams|devices)$/.test(p) ||
      p === '/api/users/guide-user/events/1/recent') return [];
  if (p === '/api/teams/count' || p === '/api/devices/count') return { count: 0 };
  if (p === '/api/teams/search') return { items: [], totalCount: 0 };
  if (p === '/api/plugins' || p === '/api/ui_plugins') return [];
  throw new Error(`Missing documentation fixture: ${method} ${p}`);
}
module.exports = { response };
