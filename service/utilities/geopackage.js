const async = require('async')
  , fs = require('fs-extra')
  , path = require('path')
  , geopackageManager = require('@ngageoint/geopackage')
  , environment = require('../environment/env');

const tileSize = 256;

module.exports = {
  validate: validate,
  tile: tile,
  features: features
};

function validate(file, done) {
  geopackageManager.openGeoPackage(file.path, (err, geopackage) => {
    if (err) return done(err);

    geopackage.getTables((err, tables) => {
      const tileTables = tables.tiles.map(tableName => ({name: tableName, type: 'tile'}));
      const featureTables = tables.features.map(tableName => ({name: tableName, type: 'feature'}));

      async.series([
        function extractTileMetadata(done) {
          async.eachSeries(tileTables, (tileTable, done) => {
            geopackage.getTileDaoWithTableName(tileTable.name, (err, tileDao) => {
              tileTable.minZoom = tileDao.minWebMapZoom;
              tileTable.maxZoom = tileDao.maxWebMapZoom;
              done();
            });
          }, done);
        },
        function indexFeatureTables(done) {
          async.eachSeries(featureTables, (featureTable, done) => {
            geopackage.getFeatureDaoWithTableName(featureTable.name, (err, featureDao) => {
              featureDao.featureTableIndex.indexWithForce(false, () => {}, done);
            });
          }, done);
        },
        function cleanup(done) {
          // GeoPackage file size may have changed after index, update the metadata
          geopackage.connection.getDBConnection().on('close', function() {
            fs.stat(file.path)
              .then((stats) => {
                file.size = stats.size;
                done();
              });
          });
          geopackage.close();
        }
      ], err => {
        if (err) return done(err);

        done(null, {
          metadata: {
            tables: tileTables.concat(featureTables)
          }
        });
      });
    });
  });
}

function tile(layer, tableName, {x, y, z}, done) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
  fs.stat(geopackagePath)
    .then(() => {
      geopackageManager.openGeoPackage(geopackagePath, (err, geopackage) => {
        if (!geopackage) return done(new Error("Cannot open geopackage"));

        const table = layer.tables.find(table => table.name === tableName);
        if (!table) return done(new Error("Table '" + table + "' does not exist in GeoPackage"));

        switch(table.type) {
        case 'tile':
          geopackageManager.getTileFromXYZ(geopackage, table.name, x, y, z, tileSize, tileSize, function(err, data) {
            geopackage.close();
            done(err, data);
          });
          break;
        case 'feature':
          geopackageManager.getFeatureTileFromXYZ(geopackage, table.name, x, y, z, tileSize, tileSize, function(err, data) {
            geopackage.close();
            done(err, data);
          });
          break;
        }
      });
    })
    .catch(err => done(err));
}

function features(layer, tableName, {x, y, z}, buffer, done) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

  fs.stat(geopackagePath)
    .then(() => {
      geopackageManager.openGeoPackage(geopackagePath, (err, geopackage) => {
        if (!geopackage) return done(new Error("Cannot open geopackage"));

        const table = layer.tables.find(table => table.name === tableName);
        if (!table) return done(new Error("Table '" + table + "' does not exist in GeoPackage"));
        geopackageManager.getGeoJSONFeaturesInTile(geopackage, table.name, x, y, z, {tileSize: tileSize, buffer: buffer}, (err, features) => {
          done(null, {
            type: 'FeatureCollection',
            features: features
          });
        });
      });
    })
    .catch(err => done(err));
}
