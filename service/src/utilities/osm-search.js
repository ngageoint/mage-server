const crypto = require('crypto');
const request = require('superagent');
const { toFeatures } = require('./osm-geometry');
const { normalizeArea } = require('./osm-area');

const ATTRIBUTION = '© OpenStreetMap contributors · ODbL 1.0 · https://www.openstreetmap.org/copyright';
// Public operators require an identifiable application, not a generic HTTP client.
// Do not include usernames, event names, credentials or installation identifiers.
const USER_AGENT = 'MAGE-OSM-Search (+https://github.com/ngageoint/mage-server)';
const TTL = 10 * 60 * 1000;
const MAX_DEGREES = 5;
const MAX_AREA_KM2 = 100000;
const DEFAULT_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const aliases = {
  hospital: 'amenity=hospital', school: 'amenity=school', restaurant: 'amenity=restaurant',
  cafe: 'amenity=cafe', pharmacy: 'amenity=pharmacy', fire_station: 'amenity=fire_station',
  police: 'amenity=police', drinking_water: 'amenity=drinking_water', supermarket: 'shop=supermarket'
};
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }

function buildQuery(input) {
  if (!input || typeof input.search !== 'string') fail(400, 'Enter a keyword or key=value tag.');
  const drawnArea = normalizeArea(input.area);
  const bounds = drawnArea ? drawnArea.bounds : input.bounds;
  if (!bounds || !['south', 'west', 'north', 'east'].every(k => typeof bounds[k] === 'number' && Number.isFinite(bounds[k]))) {
    fail(400, 'Provide finite numeric map bounds.');
  }
  const { south, west, north, east } = bounds;
  if (south < -85 || north > 85 || west < -180 || east > 180 || south >= north || west >= east) {
    fail(400, 'Invalid bounds. Areas crossing the date line or poles are not supported.');
  }
  const area = (north - south) * (east - west) * 111.32 * 111.32 * Math.cos((north + south) * Math.PI / 360);
  if (north - south > MAX_DEGREES || east - west > MAX_DEGREES || area > MAX_AREA_KM2) {
    fail(422, `Search up to ${MAX_DEGREES}° per side and ${MAX_AREA_KM2.toLocaleString('en-US')} km². Zoom in slightly or use a smaller area.`);
  }
  let search = input.search.trim();
  if (!search || search.length > 64) fail(400, 'Use 1–64 characters.');
  const alias = search.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(aliases, alias)) search = aliases[alias];
  let filter;
  if (/^[a-zA-Z0-9_:]{1,40}=\*$/.test(search)) {
    filter = `[${JSON.stringify(search.slice(0, -2))}]`;
  } else if (search.includes('=')) {
    const match = /^([a-zA-Z0-9_:]{1,40})=([a-zA-Z0-9_: .\/-]{1,60})$/.exec(search);
    if (!match) fail(400, 'Use a simple literal tag such as amenity=hospital; query syntax is not allowed.');
    filter = `[${JSON.stringify(match[1])}=${JSON.stringify(match[2])}]`;
  } else {
    if (!/^[\p{L}\p{N} _:-]+$/u.test(search)) fail(400, 'Use a simple keyword, tag key, or key=value tag.');
    // Presence of a tag key is explicit via a trailing =*; words search names.
    filter = `["name"~${JSON.stringify(search)},i]`;
  }
  // No rounding: even tiny visible extents retain their exact coordinates.
  return `[out:json][timeout:20][maxsize:8388608];nwr${filter}${drawnArea ? drawnArea.filter : `(${south},${west},${north},${east})`};out geom 501;`;
}

class OsmSearch {
  constructor(options = {}) {
    const customEndpoint = options.endpoint || process.env.MAGE_OVERPASS_URL;
    // Never send a private/custom provider's queries to a public fallback.
    this.endpoints = customEndpoint ? [customEndpoint] : DEFAULT_ENDPOINTS;
    this.endpoint = this.endpoints[0];
    for (const endpoint of this.endpoints) {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('MAGE_OVERPASS_URL must be an HTTPS URL without credentials.');
    }
    this.transport = options.transport || (async (endpoint, query) => {
      const response = await request.post(endpoint).set('User-Agent', USER_AGENT).redirects(0)
        .type('form').send({ data: query }).timeout({ response: 22000, deadline: 25000 })
        .maxResponseSize(6 * 1024 * 1024).accept('json');
      return response.body;
    });
    this.wait = options.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    this.fetch = options.fetch || (query => this.fetchAvailable(query));
    this.now = options.now || Date.now;
    this.entries = new Map();
    this.users = new Map();
    this.active = 0;
    this.exports = 0;
  }

  async fetchAvailable(query) {
    let last;
    // One bounded retry after the configured providers have been tried.
    // Custom installations never send their queries to another provider.
    for (let attempt = 0; attempt < this.endpoints.length + 1; attempt++) {
      if (attempt >= this.endpoints.length) {
        const transient = last?.osmKind === 'timeout' || last?.timeout || last?.code === 'ETIMEDOUT' ||
          [429, 500, 502, 503, 504].includes(Number(last?.status));
        if (!transient) break;
        await this.wait(750);
      }
      const endpoint = this.endpoints[attempt % this.endpoints.length];
      try {
        const data = await this.transport(endpoint, query);
        if (!data || data.remark || !Array.isArray(data.elements)) {
          const error = new Error('Incomplete provider response');
          error.osmKind = /timed?\s*out|timeout/i.test(String(data?.remark || '')) ? 'timeout' : 'incomplete';
          throw error;
        }
        return data;
      } catch (error) {
        last = error;
        // Invalid queries and authentication failures are not provider outages.
        if ([400, 401, 403].includes(Number(error.status))) break;
      }
    }
    const error = new Error('No configured Overpass provider completed the request');
    error.osmKind = last?.osmKind || (Number(last?.status) === 504 ? 'gateway' :
      last?.timeout || last?.code === 'ETIMEDOUT' ? 'timeout' : 'connection');
    error.upstreamStatus = Number(last?.status) || undefined;
    throw error;
  }

  prune() {
    const now = this.now();
    for (const [id, entry] of this.entries) if (entry.expiry <= now) this.entries.delete(id);
    for (const [id, time] of this.users) if (time + 60000 <= now) this.users.delete(id);
  }

  async search(userId, input) {
    const query = buildQuery(input);
    this.prune();
    const now = this.now();
    if (this.users.has(userId) && this.users.get(userId) + 5000 > now) fail(429, 'Wait five seconds between searches.');
    if (this.users.size >= 1000 && !this.users.has(userId)) fail(503, 'Search is busy. Try again shortly.');
    this.users.set(userId, now);
    // Cache exact user-owned searches only; bounds are never quantized.
    const cached = [...this.entries.values()].find(e => e.userId === userId && e.query === query);
    if (cached) {
      // Keep recently reused searches; capacity is not an availability limit.
      this.entries.delete(cached.result.searchId);
      this.entries.set(cached.result.searchId, cached);
      return cached.result;
    }
    if (this.active >= 2) fail(503, 'Search is busy. Try again shortly.');
    this.active++;
    try {
      let data;
      try { data = await this.fetch(query); }
      catch (error) {
        if (error.osmKind === 'gateway') fail(504, 'The Overpass provider gateway timed out before returning results. This does not by itself mean your search area is too large. Wait briefly and retry; if it persists, ask your administrator to check the configured provider.');
        if (error.osmKind === 'timeout') fail(504, 'The OSM search providers timed out. Try a smaller area or a more specific tag, then retry.');
        if (error.upstreamStatus === 429) fail(503, 'The OSM search providers are rate-limited. Wait a minute and retry.');
        if (error.upstreamStatus) fail(502, `The OSM provider rejected the request (HTTP ${error.upstreamStatus}). Retry later; if this persists, ask your administrator to check outbound access and the configured Overpass provider.`);
        if (error.osmKind === 'incomplete') fail(502, 'The OSM providers returned incomplete data. Try a smaller area or more specific tag.');
        fail(502, 'Unable to connect to an OSM search provider. Check the server’s internet access or configured Overpass provider, then retry.');
      }
      if (!data || data.remark || !Array.isArray(data.elements)) fail(502, 'Overpass returned incomplete or invalid data. Try a smaller area.');
      if (data.elements.length > 500) fail(422, 'More than 500 results. Zoom in or use a more specific tag.');
      const converted = toFeatures(data.elements, ATTRIBUTION);
      const searchId = crypto.randomBytes(24).toString('hex');
      const expiry = this.now() + TTL;
      const result = { searchId, type: 'FeatureCollection', ...converted, attribution: ATTRIBUTION,
        expiresAt: new Date(expiry).toISOString() };
      // Evict least recently used results, including at concurrent completions,
      // instead of refusing ordinary searches until the ten-minute TTL elapses.
      while (this.entries.size >= 20) this.entries.delete(this.entries.keys().next().value);
      this.entries.set(searchId, { userId, query, expiry, result });
      return result;
    } finally { this.active--; }
  }

  selected(userId, input) {
    this.prune();
    const entry = input && this.entries.get(input.searchId);
    if (!entry || entry.userId !== userId) fail(410, 'Search expired or is unavailable. Search the map again.');
    if (!Array.isArray(input.ids) || !input.ids.length || input.ids.length > 500 ||
      input.ids.some(id => typeof id !== 'string') || new Set(input.ids).size !== input.ids.length) {
      fail(400, 'Select 1–500 unique search results.');
    }
    const selected = entry.result.features.filter(f => input.ids.includes(f.id));
    if (selected.length !== input.ids.length) fail(400, 'Selection contains a result not in this search.');
    return selected;
  }
}

module.exports = { OsmSearch, buildQuery, ATTRIBUTION, fail, MAX_DEGREES, MAX_AREA_KM2 };
