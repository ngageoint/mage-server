import type { FeatureCollection, GeoJSON, Geometry, LineString, Point, Polygon, Position } from 'geojson';
import { kml } from '@tmcw/togeojson';
import { wktToGeoJSON } from '@terraformer/wkt';

export type CoordinateSystem = 'wgs84' | 'dms' | 'mgrs' | 'gars';

export interface FormattedCoordinate {
  position: Position;
  coordinateSystem: CoordinateSystem;
}

export type GeometryType = Point['type'] | LineString['type'] | Polygon['type'];

export type ShapeFormat = 'geojson' | 'wkt' | 'kml';

export interface Shape {
  format: ShapeFormat;
  type?: GeometryType;
  coordinates: Position[];
}

export class ShapeFormatError extends Error {}

export function shapeFromText(text: string): Shape | null {
  const trimmed = text.trim();
  return shapeFromJSON(trimmed) ?? shapeFromWKT(trimmed) ?? shapeFromKML(trimmed);
}

function shapeFromJSON(text: string): Shape | null {
  const json = parseJSON(text);
  if (Array.isArray(json)) {
    const positions = typeof json[0] === 'number' ? [json] : json;
    return { format: 'geojson', coordinates: positions.map(toPosition) };
  }

  return json !== null && typeof json === 'object' ? toShape('geojson', json as GeoJSON) : null;
}

function shapeFromWKT(text: string): Shape | null {
  const geojson = parseWKT(text);
  return geojson ? toShape('wkt', geojson) : null;
}

function shapeFromKML(text: string): Shape | null {
  const geojson = parseKML(text);
  return geojson ? toShape('kml', geojson) : null;
}

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseWKT(text: string): GeoJSON | null {
  try {
    // Terraformer only reads upper case keywords
    return wktToGeoJSON(text.toUpperCase());
  } catch {
    return null;
  }
}

function parseKML(text: string): FeatureCollection<Geometry | null> | null {
  if (!text.startsWith('<')) {
    return null;
  }

  const document = new DOMParser().parseFromString(text, 'text/xml');
  if (document.getElementsByTagName('parsererror').length) {
    return null;
  }

  const features = kml(document);
  return features.features.length ? features : null;
}

function toShape(format: ShapeFormat, geojson: GeoJSON | FeatureCollection<Geometry | null>): Shape {
  const geometries = geometriesOf(geojson);
  if (geometries.length !== 1) {
    throw new ShapeFormatError(`Expected one shape, found ${geometries.length}`);
  }

  const geometry: any = geometries[0];
  if (['Point', 'LineString', 'Polygon'].includes(geometry?.type) && !Array.isArray(geometry.coordinates)) {
    throw new ShapeFormatError(`This ${geometry.type} has no coordinates`);
  }

  switch (geometry?.type) {
    case 'Point':
      return { format, type: 'Point', coordinates: [toPosition(geometry.coordinates)] };
    case 'LineString':
      return { format, type: 'LineString', coordinates: geometry.coordinates.map(toPosition) };
    case 'Polygon':
      return { format, type: 'Polygon', coordinates: polygonRing(geometry.coordinates).map(toPosition) };
    default:
      throw unsupported(geometry?.type);
  }
}

function geometriesOf(geojson: any): (Geometry | null)[] {
  switch (geojson?.type) {
    case 'FeatureCollection':
      return (geojson.features || []).flatMap(geometriesOf);
    case 'Feature':
      return geojson.geometry ? geometriesOf(geojson.geometry) : [null];
    case 'GeometryCollection':
      return (geojson.geometries || []).flatMap(geometriesOf);
    default:
      return [geojson];
  }
}

function polygonRing<T>(rings: T[][]): T[] {
  if (rings.length > 1) {
    throw new ShapeFormatError('Polygons with holes are not supported');
  }

  return withoutClosingPoint(rings[0] || []);
}

export function withoutClosingPoint<T>(positions: T[]): T[] {
  const first = JSON.stringify(positions[0]);
  return positions.length > 1 && first === JSON.stringify(positions[positions.length - 1]) ? positions.slice(0, -1) : positions;
}

function toPosition(position: any): Position {
  const [longitude, latitude] = Array.isArray(position) ? position : [];
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new ShapeFormatError(`Not a valid longitude, latitude: ${JSON.stringify(position)}`);
  }

  return [longitude, latitude];
}

function unsupported(type?: string): ShapeFormatError {
  return new ShapeFormatError(type ? `${type} is not supported, use a point, line or polygon` : "Can't find a geometry");
}
