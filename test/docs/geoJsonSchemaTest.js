const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const YAML = require('yaml');
const expect = require('chai').expect;

const fixture = {
  Point: {
    valid: {
      "spec example a.1": {
        "type": "Point",
        "coordinates": [ 100.0, 0.0 ]
      },
      "point with other members": {
        type: 'Point',
        coordinates: [ 23, 32 ],
        heading: 27.8
      }
    },
    invalid: {
      "point with wrong type": {
        type: "MultiPoint",
        coordinates: [ 10, 20 ]
      },
      "point with wrong coordinates": {
        type: "Point",
        coordinates: [ [ 1, 2 ], [ 3, 4 ] ]
      },
      "point with no type": {
        coordinates: [ 7, 35 ]
      },
      "point with null type": {
        type: null,
        coordinates: [ 8, 9 ]
      }
    }
  },
  LineString: {
    valid: {
      "spec example a.2": {
        "type": "LineString",
        "coordinates": [
          [ 100.0, 0.0 ],
          [ 101.0, 1.0 ]
        ]
      }
    },
    invalid: {

    }
  },
  Polygon: {
    valid: {
      "spec example a.3 without holes": {
        "type": "Polygon",
        "coordinates": [
          [
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0]
          ]
        ]
      },
      "spec example a.3 with holes": {
        "type": "Polygon",
        "coordinates": [
          [
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0]
          ],
          [
            [100.8, 0.8],
            [100.8, 0.2],
            [100.2, 0.2],
            [100.2, 0.8],
            [100.8, 0.8]
          ]
        ]
      }
    },
    invalid: {

    }
  },
  MultiPoint: {
    valid: {
      "spec example a.4": {
        "type": "MultiPoint",
        "coordinates": [
          [100.0, 0.0],
          [101.0, 1.0]
        ]
      }
    },
    invalid: {

    }
  },
  MultiLineString: {
    valid: {
      "spec example a.5": {
        "type": "MultiLineString",
        "coordinates": [
          [
            [100.0, 0.0],
            [101.0, 1.0]
          ],
          [
            [102.0, 2.0],
            [103.0, 3.0]
          ]
        ]
      }
    },
    invalid: {

    }
  },
  MultiPolygon: {
    valid: {
      "spec example a.6": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [102.0, 2.0],
              [103.0, 2.0],
              [103.0, 3.0],
              [102.0, 3.0],
              [102.0, 2.0]
            ]
          ],
          [
            [
              [100.0, 0.0],
              [101.0, 0.0],
              [101.0, 1.0],
              [100.0, 1.0],
              [100.0, 0.0]
            ],
            [
              [100.2, 0.2],
              [100.2, 0.8],
              [100.8, 0.8],
              [100.8, 0.2],
              [100.2, 0.2]
            ]
          ]
        ]
      }
    }
  },
  GeometryCollection: {
    valid: {
      "spec example a.7": {
        "type": "GeometryCollection",
        "geometries": [
          {
            "type": "Point",
            "coordinates": [100.0, 0.0]
          },
          {
            "type": "LineString",
            "coordinates": [
                [101.0, 0.0],
                [102.0, 1.0]
            ]
          }
        ]
      }
    }
  },
  Feature: {
    valid: {

    },
    invalid: {

    }
  },
  FeatureCollection: {
    valid: {

    },
    invalid: {

    }
  }
};

fixture.FeatureCollection.valid['featurecollection with all features'] = {
  type: 'FeatureCollection',
  features: []
};

Object.keys(fixture).forEach(geoJsonType => {
  if (/^Feature/.test(geoJsonType)) {
    return;
  }
  for (const instanceDesc in fixture[geoJsonType].valid) {
    const geometry = fixture[geoJsonType].valid[instanceDesc];
    const feature =  {
      type: 'Feature',
      geometry: geometry,
      properties: null
    };
    fixture.Feature.valid[`${geoJsonType} feature with ${instanceDesc}`] = feature;
    fixture.FeatureCollection.valid['featurecollection with all features'].features.push(feature);
  }
});

expect(fixture.FeatureCollection.valid['featurecollection with all features'].features.length).to.be.greaterThan(1);

describe('GeoJSON schema', function() {

  const schemaPath = path.join(__dirname, '..', '..', 'docs', 'geojson.yaml');
  const schemaDoc = YAML.parse(fs.readFileSync(schemaPath).toString('utf-8'));
  const ajv = new Ajv({ schemaId: 'id', allErrors: true, nullable: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
  let validate;

  beforeEach(function() {
    validate = ajv.compile(schemaDoc);
  });

  for (const geoJsonType in fixture) {
    const validInstances = fixture[geoJsonType].valid;
    const invalidInstances = fixture[geoJsonType].invalid;

    describe(`${geoJsonType} validation`, function() {

      for (const instanceDesc in validInstances) {

        it(`validates ${instanceDesc}`, function() {

          const valid = validate(validInstances[instanceDesc]);
          expect(valid, `validation failed on ${geoJsonType} ${instanceDesc}\n${ajv.errorsText()}`).to.be.true;
          expect(validate.errors).to.be.null;
        });
      }

      for (const instanceDesc in invalidInstances) {

        it(`invalidates ${instanceDesc}`, function() {

          const valid = validate(invalidInstances[instanceDesc]);
          expect(valid, `validation passed on invalid ${geoJsonType} ${instanceDesc}`).to.be.false;
          expect(validate.errors.length).to.be.greaterThan(0);
        });
      }
    });
  }
});
