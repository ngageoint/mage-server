// Convert the geometry included by Overpass `out geom` without resolving
// additional objects or making unbounded follow-up network requests.
const validPoint = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) &&
  Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const closed = line => line.length >= 4 && same(line[0], line[line.length - 1]);

function lineOf(geometry) {
  if (!Array.isArray(geometry) || geometry.length < 2 || !geometry.every(validPoint)) return null;
  return geometry.map(p => [p.lon, p.lat]);
}

function ringsOf(lines) {
  const pending = lines.map(line => line.slice());
  const rings = [];
  while (pending.length) {
    const ring = pending.shift();
    while (!closed(ring)) {
      const i = pending.findIndex(line => same(ring[ring.length - 1], line[0]) ||
        same(ring[ring.length - 1], line[line.length - 1]));
      if (i === -1) return null; // Incomplete relation: do not invent an area.
      const line = pending.splice(i, 1)[0];
      if (!same(ring[ring.length - 1], line[0])) line.reverse();
      ring.push(...line.slice(1));
    }
    rings.push(ring);
  }
  return rings;
}

function contains(ring, point) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function geometryOf(element) {
  if (element.type === 'node') {
    return validPoint(element) ? { type: 'Point', coordinates: [element.lon, element.lat] } : null;
  }
  if (element.type === 'way') {
    const line = lineOf(element.geometry);
    if (!line) return null;
    const tags = element.tags || {};
    const area = tags.area === 'yes' || (tags.area !== 'no' &&
      ['building', 'landuse', 'leisure', 'amenity', 'shop', 'natural'].some(k => tags[k]) &&
      !['coastline', 'cliff', 'ridge', 'tree_row'].includes(tags.natural));
    return closed(line) && area ? { type: 'Polygon', coordinates: [line] } :
      { type: 'LineString', coordinates: line };
  }
  if (element.type !== 'relation' || !Array.isArray(element.members)) return null;
  if (element.members.some(m => m.type === 'relation')) return null;
  const ways = element.members.filter(m => m.type === 'way');
  if (!ways.length) return null;
  const lines = ways.map(m => lineOf(m.geometry));
  if (lines.some(line => !line)) return null;
  if (['multipolygon', 'boundary'].includes((element.tags || {}).type)) {
    if (ways.some(m => !['', 'outer', 'inner'].includes(m.role || ''))) return null;
    const outers = ringsOf(lines.filter((_, i) => ways[i].role !== 'inner'));
    const inners = ringsOf(lines.filter((_, i) => ways[i].role === 'inner'));
    if (!outers || !outers.length || !inners) return null;
    const polygons = outers.map(r => [r]);
    for (const hole of inners) {
      const parents = polygons.filter(p => contains(p[0], hole[0]));
      if (parents.length !== 1) return null;
      parents[0].push(hole);
    }
    return { type: 'MultiPolygon', coordinates: polygons };
  }
  // Route relations retain member paths, not an invented polygon or centroid.
  return { type: 'MultiLineString', coordinates: lines };
}

function toFeatures(elements, attribution) {
  let coordinateCount = 0;
  let skipped = 0;
  const features = [];
  const seen = new Set();
  for (const element of elements) {
    if (!element || typeof element !== 'object' ||
      (element.geometry !== undefined && !Array.isArray(element.geometry)) ||
      (element.members !== undefined && (!Array.isArray(element.members) ||
        element.members.some(m => !m || (m.geometry !== undefined && !Array.isArray(m.geometry)))))) {
      skipped++;
      continue;
    }
    // Bound work before ring assembly, including malformed upstream payloads.
    const count = (element.geometry || []).length +
      (element.members || []).reduce((sum, m) => sum + (m.geometry || []).length, 0) + 1;
    coordinateCount += count;
    if (coordinateCount > 30000) {
      const error = new Error('Too much geometry. Zoom in or use a more specific tag.');
      error.status = 422;
      throw error;
    }
    const geometry = geometryOf(element);
    if (!geometry || !Number.isSafeInteger(element.id) || element.id <= 0) { skipped++; continue; }
    const id = `${element.type}/${element.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = Object.fromEntries(Object.entries(element.tags || {})
      .filter(([key, value]) => key.length <= 255 && typeof value === 'string' && value.length <= 4096));
    features.push({ type: 'Feature', id, geometry, properties: {
      osm_id: String(element.id), osm_type: element.type, name: tags.name || id,
      tags: JSON.stringify(tags), source: `https://www.openstreetmap.org/${id}`, attribution
    } });
  }
  return { features, skipped };
}

module.exports = { toFeatures, geometryOf };
