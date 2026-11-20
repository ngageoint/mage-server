import { shapeFromText } from './entities.geometry';

describe('shapeFromText', () => {
  it('ignores plain coordinates', () => {
    expect(shapeFromText('39.74, -104.99\n39.75, -104.98')).toBeNull();
  });

  describe('GeoJSON', () => {
    it('reads a shape in longitude, latitude order', () => {
      expect(shapeFromText('{"type":"LineString","coordinates":[[-104.99,39.74],[-104.98,39.75]]}')).toEqual({
        format: 'geojson',
        type: 'LineString',
        coordinates: [[-104.99, 39.74], [-104.98, 39.75]]
      });
    });

    it('reads a polygon without its closing point', () => {
      const shape = shapeFromText('{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}');

      expect(shape?.type).toBe('Polygon');
      expect(shape?.coordinates.length).toBe(3);
    });

    it('reads a feature and a collection with one feature', () => {
      const point = '{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[-104.99,39.74]}}';

      expect(shapeFromText(point)?.type).toBe('Point');
      expect(shapeFromText(`{"type":"FeatureCollection","features":[${point}]}`)?.type).toBe('Point');
    });

    it('reads a bare coordinate array without a shape type', () => {
      const shape = shapeFromText('[[-104.99,39.74],[-104.98,39.75]]');

      expect(shape?.type).toBeUndefined();
      expect(shape?.coordinates.length).toBe(2);
    });

    it('reads a geometry collection with one geometry and a feature without a geometry', () => {
      expect(shapeFromText('{"type":"GeometryCollection","geometries":[{"type":"Point","coordinates":[-104.99,39.74]}]}')?.type).toBe('Point');
      expect(() => shapeFromText('{"type":"Feature","properties":{}}')).toThrowError("Can't find a geometry");
    });

    it('rejects collections with more than one feature', () => {
      const point = '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}';

      expect(() => shapeFromText(`{"type":"FeatureCollection","features":[${point},${point}]}`)).toThrowError('Expected one shape, found 2');
    });

    it('rejects polygons with holes and multi geometries', () => {
      expect(() => shapeFromText('{"type":"Polygon","coordinates":[[[0,0],[4,0],[4,4],[0,0]],[[1,1],[2,1],[2,2],[1,1]]]}')).toThrowError('Polygons with holes are not supported');
      expect(() => shapeFromText('{"type":"MultiPoint","coordinates":[[0,0]]}')).toThrowError(/MultiPoint is not supported/);
    });

    it('rejects coordinates out of range', () => {
      expect(() => shapeFromText('{"type":"Point","coordinates":[39.74,-104.99]}')).toThrowError(/Not a valid longitude, latitude/);
    });

    it('ignores invalid JSON and JSON that is not an object', () => {
      expect(shapeFromText('{"type":')).toBeNull();
      expect(shapeFromText('39.74')).toBeNull();
    });

    it('rejects a shape without coordinates', () => {
      expect(() => shapeFromText('{"type":"Polygon"}')).toThrowError('This Polygon has no coordinates');
      expect(() => shapeFromText('{"type":"LineString"}')).toThrowError('This LineString has no coordinates');
    });
  });

  describe('WKT', () => {
    it('reads a point, line and polygon', () => {
      expect(shapeFromText('POINT (-104.99 39.74)')?.coordinates).toEqual([[-104.99, 39.74]]);
      expect(shapeFromText('LINESTRING(-104.99 39.74, -104.98 39.75)')?.type).toBe('LineString');

      const polygon = shapeFromText('polygon Z ((0 0 5, 1 0 5, 1 1 5, 0 0 5))');
      expect(polygon?.type).toBe('Polygon');
      expect(polygon?.coordinates.length).toBe(3);
    });

    it('rejects multi geometries and holes', () => {
      expect(() => shapeFromText('MULTIPOINT ((0 0), (1 1))')).toThrowError(/MultiPoint is not supported/);
      expect(() => shapeFromText('POLYGON ((0 0, 4 0, 4 4, 0 0), (1 1, 2 1, 2 2, 1 1))')).toThrowError('Polygons with holes are not supported');
    });
  });

  describe('KML', () => {
    it('reads a placemark polygon', () => {
      const shape = shapeFromText(`<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
        -104.99,39.74,0 -104.98,39.74,0 -104.98,39.75,0 -104.99,39.74,0
      </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`);

      expect(shape?.format).toBe('kml');
      expect(shape?.type).toBe('Polygon');
      expect(shape?.coordinates[0]).toEqual([-104.99, 39.74]);
      expect(shape?.coordinates.length).toBe(3);
    });

    it('reads a placemark inside a kml document', () => {
      const shape = shapeFromText(`<?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Line</name>
          <LineString><coordinates>-104.99,39.74 -104.98,39.75</coordinates></LineString>
        </Placemark></Document></kml>`);

      expect(shape?.type).toBe('LineString');
      expect(shape?.coordinates).toEqual([[-104.99, 39.74], [-104.98, 39.75]]);
    });

    it('rejects more than one placemark', () => {
      const point = '<Placemark><Point><coordinates>-104.99,39.74</coordinates></Point></Placemark>';

      expect(() => shapeFromText(`<Document>${point}${point}</Document>`)).toThrowError('Expected one shape, found 2');
    });

    it('ignores xml that cannot be read', () => {
      expect(shapeFromText('<Point><coordinates>-104.9,39.7')).toBeNull();
    });
  });
});
