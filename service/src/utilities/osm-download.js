const { ATTRIBUTION } = require('./osm-search');

const xml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[char]));

function csvCell(value) {
  let text = String(value ?? '');
  // OSM strings are untrusted. Prevent spreadsheet formula execution.
  if (typeof value !== 'number' && /^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportCsv(features) {
  const fields = ['osm_id', 'osm_type', 'name', 'geometry_type', 'longitude', 'latitude',
    'geometry_geojson', 'tags', 'source', 'attribution'];
  const rows = features.map(feature => {
    const p = feature.properties;
    const point = feature.geometry.type === 'Point' ? feature.geometry.coordinates : [];
    return [p.osm_id, p.osm_type, p.name, feature.geometry.type, point[0], point[1],
      JSON.stringify(feature.geometry), p.tags, p.source, p.attribution || ATTRIBUTION];
  });
  return Buffer.from('\ufeff' + [fields, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n', 'utf8');
}

function geometryKml(geometry) {
  const coords = points => points.map(point => point.join(',')).join(' ');
  const ring = points => `<LinearRing><coordinates>${coords(points)}</coordinates></LinearRing>`;
  const c = geometry.coordinates;
  switch (geometry.type) {
    case 'Point': return `<Point><coordinates>${c.join(',')}</coordinates></Point>`;
    case 'LineString': return `<LineString><coordinates>${coords(c)}</coordinates></LineString>`;
    case 'Polygon': return `<Polygon><outerBoundaryIs>${ring(c[0])}</outerBoundaryIs>${c.slice(1).map(hole => `<innerBoundaryIs>${ring(hole)}</innerBoundaryIs>`).join('')}</Polygon>`;
    case 'MultiPoint':
    case 'MultiLineString':
    case 'MultiPolygon': {
      const type = geometry.type.slice(5);
      return `<MultiGeometry>${c.map(coordinates => geometryKml({ type, coordinates })).join('')}</MultiGeometry>`;
    }
    case 'GeometryCollection': return `<MultiGeometry>${geometry.geometries.map(geometryKml).join('')}</MultiGeometry>`;
    default: throw new Error(`Unsupported KML geometry: ${geometry.type}`);
  }
}

function exportKml(features) {
  const places = features.map(feature => {
    const p = feature.properties;
    const data = { ...p, attribution: p.attribution || ATTRIBUTION };
    return `<Placemark><name>${xml(p.name || feature.id)}</name><ExtendedData>${Object.entries(data)
      .map(([key, value]) => `<Data name="${xml(key)}"><value>${xml(value)}</value></Data>`).join('')}</ExtendedData>${geometryKml(feature.geometry)}</Placemark>`;
  }).join('');
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>OSM search results</name><description>${xml(ATTRIBUTION)}</description>${places}</Document></kml>`, 'utf8');
}

module.exports = { exportCsv, exportKml };
