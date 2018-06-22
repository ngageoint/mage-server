const async = require('async')
  , fs = require('fs-extra')
  , path = require('path')
  , pointToLineDistance = require('@turf/point-to-line-distance').default
  , centroid = require('@turf/centroid')
  , polygonToLine = require('@turf/polygon-to-line').default
  , booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default
  , pointDistance = require('@turf/distance').default
  , geopackageManager = require('@ngageoint/geopackage')
  , environment = require('../environment/env');

const BoundingBox = geopackageManager.BoundingBox;

module.exports = {
  open: open,
  tile: tile,
  closestFeature: closestFeature
};

function open(file, done) {
  geopackageManager.openGeoPackage(file.path, (err, geopackage) => {
    if (err) return done(err);

    geopackage.getTables((err, tables) => {
      const tileTables = tables.tiles.map(tableName => ({name: tableName, type: 'tile'}));
      const featureTables = tables.features.map(tableName => ({name: tableName, type: 'feature'}));

      async.parallel([
        function(done) {
          async.each(tileTables, (tileTable, done) => {
            geopackage.getTileDaoWithTableName(tileTable.name, (err, tileDao) => {
              tileTable.minZoom = tileDao.minWebMapZoom;
              tileTable.maxZoom = tileDao.maxWebMapZoom;
              done();
            });
          }, err => done(err));
        },
        function(done) {
          async.each(featureTables, (featureTable, done) => {
            geopackage.getFeatureDaoWithTableName(featureTable.name, (err, featureDao) => {
              featureDao.featureTableIndex.index(() => {}, (err) => {
                console.log('indexed GeoPackage with err', err);
                done(err);
              });
            });
          }, err => done(err));
        }
      ], err => {
        if (err) return done(err);

        done(null, {
          geopackage: geopackage,
          metadata: {
            tables: tileTables.concat(featureTables)
          }
        });
      });
    });
  });
}

function tile(layer, tableName, tileParams, done) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
  const {x, y, z} = tileParams;

  fs.stat(geopackagePath)
    .then(() => {
      geopackageManager.openGeoPackage(geopackagePath, (err, geopackage) => {
        if (!geopackage) return done(new Error("Cannot open geopackage"));

        const table = layer.tables.find(table => table.name === tableName);
        if (!table) return done(new Error("Table '" + table + "' does not exist in GeoPackage"));

        switch(table.type) {
        case 'tile':
          geopackageManager.getTileFromXYZ(geopackage, table.name, x, y, z, 256, 256, done);
          break;
        case 'feature':
          geopackageManager.getFeatureTileFromXYZ(geopackage, table.name, x, y, z, 256, 256, done);
          break;
        }
      });
    })
    .catch(err => done(err));
}

function closestFeature(bbox, layers, layerParams, done) {
  const boundingBox = new BoundingBox(bbox[0], bbox[2], bbox[1], bbox[3]);
  const centerPoint = centroid(boundingBox.toGeoJSON());

  async.reduce(layers, {distance: Number.MAX_VALUE}, (closest, layer, done) => {
    const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
    const tables = layerParams[layer.id.toString()].tables;
    geopackageManager.openGeoPackage(geopackagePath, (err, geopackage) => {
      if (err) return done(err);

      async.reduce(tables, closest, (closest, table, done) => {
        geopackage.getFeatureDaoWithTableName(table, (err, featureDao) => {
          if (err) return done(err);

          featureDao.queryForGeoJSONIndexedFeaturesWithBoundingBox(boundingBox, (err, feature, next) => {
            if (err) return done(err);
            closest = closestToFeature(closest, feature, centerPoint);
            next();
          }, err => {
            if (err || !closest.feature) return done(err);

            closest.feature.layerId = layer._id;
            closest.feature.table = table;
            done(err, closest.feature);
          });
        });

      }, done);
    });
  }, done);
}

function closestToFeature(feature1, feature2, centerPoint) {
  switch(feature2.geometry.type) {
  case 'Point':
    return comparePoint(feature1, feature2, centerPoint);
  case 'LineString':
    return compareLine(feature1, feature2, centerPoint);
  case 'Polygon':
    return comparePolygon(feature1, feature2, centerPoint);
  default:
    return feature1;
  }
}

function comparePoint(feature1, feature2, centerPoint) {
  const distance = pointDistance(centerPoint, feature2.geometry);
  if (distance < feature1.distance || distance === feature1.distance && feature1.feature.type !== 'Point') {
    return {
      feature: feature2,
      distance: distance
    };
  }

  return feature1;
}

function compareLine(feature1, feature2, centerPoint) {
  const distance = pointToLineDistance(centerPoint, feature2.geometry);
  if (distance < feature1.distance || distance === feature1.distance && feature1.feature.type !== 'Point') {
    return {
      feature: feature2,
      distance: distance
    };
  }

  return feature1;
}

function comparePolygon(feature1, feature2, centerPoint) {
  if (booleanPointInPolygon(centerPoint, feature2.geometry)) {
    if (feature1.distance !== 0) {
      return {
        feature: feature2,
        distance: 0
      };
    }
  } else {
    const distance = pointToLineDistance(centerPoint, polygonToLine(feature2.geometry));
    if (distance < feature1.distance) {
      return {
        feature: feature2,
        distance: distance
      };
    }
  }

  return feature1;
}
