// A bounded, simple GeoJSON polygon. Never interpolate unvalidated client text
// into Overpass QL or trust a client-supplied bounding box for a drawn area.
function invalid(message) {
  const error = new Error(message); error.status = 400; throw error;
}
function normalizeArea(area) {
  if (area === undefined) return null;
  if (!area || area.type !== 'Polygon' || !Array.isArray(area.coordinates) || area.coordinates.length !== 1) {
    invalid('Draw one polygon without holes.');
  }
  const ring = area.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 65) invalid('Use 3–64 vertices for the search area.');
  for (const point of ring) {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) ||
      Math.abs(point[0]) > 180 || Math.abs(point[1]) > 85) invalid('Search-area coordinates must be numeric and away from the poles.');
  }
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  if (!same(ring[0], ring[ring.length - 1])) invalid('Close the search-area polygon.');
  const points = ring.slice(0, -1);
  if (new Set(points.map(p => JSON.stringify(p))).size !== points.length) invalid('Search-area vertices must be distinct.');
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const on = (a, b, p) => Math.abs(cross(a, b, p)) < 1e-12 &&
    p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
  const intersects = (a, b, c, d) => {
    const ab1 = cross(a, b, c), ab2 = cross(a, b, d), cd1 = cross(c, d, a), cd2 = cross(c, d, b);
    return (ab1 * ab2 < 0 && cd1 * cd2 < 0) || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
  };
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    twiceArea += cross(ring[0], ring[i], ring[i + 1]);
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      if (intersects(ring[i], ring[i + 1], ring[j], ring[j + 1])) invalid('Search-area edges must not cross or touch each other.');
    }
  }
  if (Math.abs(twiceArea) < 1e-12) invalid('Draw a search area with nonzero size.');
  return {
    bounds: {
      south: Math.min(...points.map(p => p[1])), north: Math.max(...points.map(p => p[1])),
      west: Math.min(...points.map(p => p[0])), east: Math.max(...points.map(p => p[0]))
    },
    // Overpass uses latitude longitude; GeoJSON above uses longitude latitude.
    filter: `(poly:"${points.map(p => `${p[1]} ${p[0]}`).join(' ')}")`
  };
}
module.exports = { normalizeArea };
