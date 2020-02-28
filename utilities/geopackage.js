const fs = require('fs-extra'),
  path = require('path'),
  GP = require('@ngageoint/geopackage'),
  GeoPackageAPI = require('@ngageoint/geopackage').GeoPackage,
  FeatureTile = require('@ngageoint/geopackage').FeatureTiles,
  ShadedFeaturesTile = require('@ngageoint/geopackage').ShadedFeaturesTile,
  environment = require('../environment/env');

const tileSize = 256;

module.exports = {
  open,
  optimize,
  validate,
  getTables,
  tile,
  features,
  vectorTile,
  getClosestFeatures,
};

async function open(file) {
  console.log('Open GeoPackage');
  try {
    const geoPackage = await GeoPackageAPI.open(file);
    console.log('Opened the GeoPackage: ', file);
    return {
      geoPackage: geoPackage,
    };
  } catch (e) {
    return {
      validationErrors: [
        {
          error: e.toString(),
          fatal: true,
        },
      ],
    };
  }
}

async function validate(geoPackage) {
  return await geoPackage.validate();
}

function getTables(geoPackage) {
  // get the bounds for the tables
  const tables = geoPackage.getTables(true);
  const tileTables = tables.tiles.map(tableInfo => {
    return {
      name: tableInfo.table_name,
      type: 'tile',
      bbox: [tableInfo.min_x, tableInfo.min_y, tableInfo.max_x, tableInfo.max_y],
    };
  });
  const featureTables = tables.features.map(tableInfo => {
    return {
      name: tableInfo.table_name,
      type: 'feature',
      bbox: [tableInfo.min_x, tableInfo.min_y, tableInfo.max_x, tableInfo.max_y],
    };
  });
  return tileTables.concat(featureTables);
}

async function optimize(path, progress) {
  const geoPackage = await GeoPackageAPI.open(path);
  const featureTables = geoPackage.getFeatureTables();
  let success = true;
  for (let i = 0; i < featureTables.length; i++) {
    const table = featureTables[i];
    const featureDao = geoPackage.getFeatureDao(table);
    success = success && (await featureDao.index(progress));
  }
  return Promise.resolve(success);
}

async function tile(layer, tableName, { x, y, z }) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
  await fs.stat(geopackagePath);
  const geopackage = await GeoPackageAPI.open(geopackagePath);
  const table = layer.tables.find(table => table.name === tableName);
  if (!table) throw new Error("Table '" + table + "' does not exist in GeoPackage");
  let tile;
  switch (table.type) {
    case 'tile':
      tile = await geopackage.xyzTile(table.name, x, y, z, tileSize, tileSize);
      break;
    case 'feature':
      x = Number(x);
      y = Number(y);
      z = Number(z);
      const width = 256;
      const height = 256;
      const featureDao = geopackage.getFeatureDao(table.name);
      if (!featureDao) return;
      const ft = new FeatureTile(featureDao, width, height);
      ft.setMaxFeaturesPerTile(10000);
      const shadedFeaturesTile = new ShadedFeaturesTile();
      ft.setMaxFeaturesTileDraw(shadedFeaturesTile);
      tile = await ft.drawTile(x, y, z);
      break;
  }

  geopackage.close();
  return tile;
}

function features(layer, tableName, { x, y, z }) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

  return fs
    .stat(geopackagePath)
    .then(() => GeoPackageAPI.open(geopackagePath))
    .then(geopackage => {
      if (!geopackage) throw new Error('Cannot open geopackage');

      const table = layer.tables.find(table => table.name === tableName);
      if (!table) return done(new Error("Table '" + table + "' does not exist in GeoPackage"));
      return GeoPackageAPI.getGeoJSONFeaturesInTile(geopackage, table.name, x, y, z);
    })
    .then(features => {
      return {
        type: 'FeatureCollection',
        features: features,
      };
    });
}

function vectorTile(layer, tableName, { x, y, z }) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

  return fs
    .stat(geopackagePath)
    .then(() => GeoPackageAPI.open(geopackagePath))
    .then(geopackage => {
      if (!geopackage) throw new Error('Cannot open geopackage');
      const table = layer.tables.find(table => table.name === tableName);
      if (!table) return done(new Error("Table '" + table + "' does not exist in GeoPackage"));
      return GeoPackageAPI.getVectorTileProtobuf(geopackage, table.name, x, y, z);
    });
}

async function getClosestFeatures(layers, lat, lng, { x, y, z }) {
  const closestFeatures = [];
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i].layer;
    const tableName = layers[i].table;
    const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

    await fs.stat(geopackagePath);
    const geopackage = await GeoPackageAPI.open(geopackagePath);
    const table = layer.tables.find(table => table.name === tableName);
    if (!table) throw new Error("Table '" + table + "' does not exist in GeoPackage");
    const closestFeature = await GeoPackageAPI.getClosestFeatureInXYZTile(geopackage, table.name, x, y, z, lat, lng);
    if (closestFeature) closestFeatures.push(closestFeature);
  }
  closestFeatures.sort(function(first, second) {
    if (first.coverage && second.coverage) return 0;
    if (first.coverage) return 1;
    if (second.coverage) return -1;
    return first.distance - second.distance;
  });
  return closestFeatures;
}
