const { RelationType } = require('@ngageoint/geopackage/built/lib/extension/relatedTables/relationType');
const e = require('express');
const util = require('util')
  , fs = require('fs')
  , api = require('../api')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , path = require('path')
  , Exporter = require('./exporter')
  , GeoPackageAPI = require('@ngageoint/geopackage')
  , environment = require('../environment/env')
  , os = require('os')
  , wkx = require('wkx');

const attachmentBase = environment.attachmentBaseDirectory;

function GeoPackage(options) {
  GeoPackage.super_.call(this, options);
  this.iconMap = {}
}

util.inherits(GeoPackage, Exporter);
module.exports = GeoPackage;

GeoPackage.prototype.export = async function (streamable) {
  log.info('Export the GeoPackage');
  const downloadedFileName = 'mage-' + this._event.name;

  const archive = archiver('zip');
  archive.pipe(streamable);

  try {
    const filePath = await this.createGeoPackageFile();
    const gp = await GeoPackageAPI.GeoPackageAPI.create(filePath);
    await this.createUserTable(gp);
    await this.addFormDataToGeoPackage(gp);
    await this.createFormAttributeTables(gp);
    await this.createObservationTable(gp);
    await this.createObservationFeatureTableStyles(gp);
    await this.createUserFeatureTableStyles(gp);
    await this.addObservationsToGeoPackage(gp);
    await this.addLocationsToGeoPackage(gp);
    await this.addUsersToUsersTable(gp);

    log.info('GeoPackage created');
    archive.append(fs.createReadStream(filePath), { name: downloadedFileName + '.gpkg' });
    archive.on('end', function () {
      log.info('Removing temporary GeoPackage file: %s', filePath);
      fs.unlink(filePath, function () {
      });
    });
    archive.finalize();
  } catch (e) {
    log.info('Error exporting GeoPackage', e)
    throw e;
  }
};

GeoPackage.prototype.createGeoPackageFile = function () {
  log.info('Create GeoPackage File');
  const filename = moment().format('YYYMMDD_hhmmssSSS') + '.gpkg';
  const filePath = path.join(os.tmpdir(), filename);
  return new Promise(function (resolve, reject) {
    fs.unlink(filePath, function () {
      fs.mkdir(path.dirname(filePath), function () {
        fs.open(filePath, 'w', function (err) {
          if (err) return reject(err);
          resolve(filePath);
        });
      });
    });
  });
}

GeoPackage.prototype.getObservations = function () {
  this._filter.states = ['active'];

  return new Promise((resolve, reject) => {
    new api.Observation(this._event).getAll({ filter: this._filter }, (err, observations) => {
      if (err) return reject(err);
      resolve(observations);
    });
  });
}

GeoPackage.prototype.getLocations = function (lastLocationId, startDate, endDate) {
  const limit = 2000;

  return new Promise((resolve, reject) => {
    this.requestLocations({ startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit }, (err, requestedLocations) => {
      if (err) return reject(err);
      resolve(requestedLocations);
    });
  });
}

GeoPackage.prototype.createObservationTable = function (geopackage) {
  log.info('Create Observation Table');
  const columns = [];

  // TODO columns should be the same as KML file
  columns.push({
    name: 'lastModified',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'timestamp',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'mageId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'userId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'deviceId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'createdAt',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'primaryField',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'variantField',
    dataType: 'TEXT'
  });

  geopackage.createFeatureTableFromProperties('Observations', columns);
  return geopackage;
}

GeoPackage.prototype.createAttachmentTable = function (geopackage) {
  log.info('Create Attachment Table');
  const columns = [{
    name: "name",
    dataType: "TEXT"
  }, {
    name: "size",
    dataType: "REAL"
  }];
  return geopackage.createMediaTable('Attachments', columns);
}

const usersLastLocation = {};

GeoPackage.prototype.addUsersToUsersTable = async function (geopackage) {
  const userIds = Object.keys(this._users);

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    if (!usersLastLocation[userId]) {
      continue;
    }
    const user = this._users[userId];
      const geoJson = {
        type: 'Feature',
        geometry: usersLastLocation[userId].geometry,
        properties: {
          timestamp: usersLastLocation[userId].properties.timestamp,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          phones: user.phones.join(', '),
          userId: userId
        }
      };
      const userRowId = geopackage.addGeoJSONFeatureToGeoPackage(geoJson, 'Users');
      await new Promise(function (resolve, reject) {
        fs.readFile(path.join(environment.userBaseDirectory, userId, 'icon'), function (err, iconBuffer) {
          if (err) return reject(err);
          const featureTableStyles = new GeoPackageAPI.FeatureTableStyles(geopackage, 'Users');
          const iconRow = featureTableStyles.getIconDao().newRow();
          iconRow.data = iconBuffer;
          iconRow.contentType = 'image/png';
          iconRow.name = user.username;
          iconRow.description = `Icon for user ${user.username}`;
          iconRow.width = 20;
          iconRow.anchorU = 0.5;
          iconRow.anchorV = 1.0;

          resolve(featureTableStyles.setIconDefault(userRowId, iconRow))
        })
      })
  }
  const featureDao = geopackage.getFeatureDao('Users');
  const rtreeIndex = new GeoPackageAPI.RTreeIndex(geopackage, featureDao);
  await rtreeIndex.create()
}

GeoPackage.prototype.createLocationTableForUser = function (geopackage, userId) {
  const columns = [];

  columns.push({
    name: 'mageId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'userId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'timestamp',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'deviceId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'accuracy',
    dataType: 'REAL'
  });

  return geopackage.createFeatureTableFromProperties('Locations_' + userId, columns);
}

GeoPackage.prototype.addLocationsToGeoPackage = async function (geopackage, lastLocationId, startDate, endDate) {
  log.info('Add Locations');

  startDate = startDate || this._filter.startDate ? moment(this._filter.startDate) : null;
  endDate = endDate || this._filter.endDate ? moment(this._filter.endDate) : null;

  const locations = await this.getLocations(lastLocationId, startDate, endDate);
  if (!locations || locations.length === 0) {
    return geopackage;
  }

  const last = locations.slice(-1).pop();
  if (last) {
    const locationTime = moment(last.properties.timestamp);
    lastLocationId = last._id;
    if (!startDate || startDate.isBefore(locationTime)) {
      startDate = locationTime;
    }
  }

  const locationTablesCreated = {};
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];

    if (!locationTablesCreated[location.userId.toString()]) {
      await this.createLocationTableForUser(geopackage, location.userId.toString());
      locationTablesCreated[location.userId.toString()] = true;
    }

    usersLastLocation[location.userId.toString()] = location;
    const geojson = {
      type: 'Feature',
      geometry: location.geometry,
      properties: location.properties
    };

    geojson.properties.mageId = location._id.toString();
    geojson.properties.userId = location.userId.toString();
    geojson.properties.deviceId = location.properties.deviceId.toString();

    if (geojson.properties.id) {
      delete geojson.properties.id;
    }

    try {
      await geopackage.addGeoJSONFeatureToGeoPackage(geojson, 'Locations_' + location.userId.toString());
    } catch (err) {
      throw err;
    }
  }
  // go get the next batch and add them
  await this.addLocationsToGeoPackage(geopackage, lastLocationId, startDate, endDate);
  return geopackage
}

GeoPackage.prototype.createFormAttributeTables = async function (geopackage) {
  log.info('Create Form Attribute Tables');
  const formIds = Object.keys(this._event.formMap);

  for (let i = 0; i < formIds.length; i++) {
    const formId = formIds[i];
    const columns = [];
    const form = this._event.formMap[formId];
    if (form.primaryField) {
      columns.push({
        name: 'primaryField',
        dataType: 'TEXT'
      });
    }
    if (form.variantField) {
      columns.push({
        name: 'variantField',
        dataType: 'TEXT'
      });
    }
    columns.push({
      name: 'formId',
      dataType: 'INTEGER',
      default: formId
    });
    for (let i = 0; i < form.fields.length; i++) {
      const field = form.fields[i];
      columns.push({
        dataColumn: {
          column_name: field.name,
          table_name: 'Form_' + formId,
          name: field.title,
          title: field.title
        },
        name: field.name,
        dataType: this.fieldTypeToGeoPackageType(field.type)
      });
    }
    await geopackage.createAttributeTable('Form_' + formId, columns);
  }
  return geopackage;
}

GeoPackage.prototype.fieldTypeToGeoPackageType = function(fieldType) {
  switch (fieldType) {
    case 'numberfield':
      return 'INTEGER'
    case 'attachment':
    case 'textarea':
    case 'textfield':
      return 'TEXT'
    default:
      return 'TEXT'
  }  
}

GeoPackage.prototype.createUserTable = async function (geopackage) {
  const columns = [];
  columns.push({
    name: 'username',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'displayName',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'email',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'phones',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'userId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'timestamp',
    dataType: 'DATETIME'
  });
  await geopackage.createFeatureTableFromProperties('Users', columns)
  log.info('Create User Avatar Table');
  await geopackage.createMediaTable('UserAvatars');
  return geopackage;
}

GeoPackage.prototype.addFormDataToGeoPackage = async function (geopackage) {
  const columns = [];
  columns.push({
    name: 'formName',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'primaryField',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'variantField',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'color',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'formId',
    dataType: 'TEXT'
  });

  await geopackage.createAttributeTable('Forms', columns)
  for (const formId in this._event.formMap) {
    const form = this._event.formMap[formId];
    const row = {
      formName: form.name,
      primaryField: form.primaryField,
      variantField: form.variantField,
      color: form.color,
      formId: formId
    };

    geopackage.addAttributeRow('Forms', row);
  }
  return geopackage;
}

GeoPackage.prototype.addObservationsToGeoPackage = async function (geopackage) {
  log.info('Add Observations');
  const observations = await this.getObservations()
  this.createAttachmentTable(geopackage);

  for (let i = 0; i < observations.length; i++) {
    const observation = observations[i];
    let primary;
    let variant;
    if (observation.properties.forms[0]) {
      const observationFirstForm = observation.properties.forms[0];
      const form = this._event.formMap[observationFirstForm.formId];
      primary = observationFirstForm[form.primaryField];
      variant = observationFirstForm[form.variantField];
    }

    const properties = {
      lastModified: observation.lastModified,
      timestamp: observation.properties.timestamp,
      mageId: observation._id.toString(),
      userId: observation.userId.toString(),
      deviceId: observation.deviceId.toString(),
      createdAt: observation.createdAt,
      primaryField: primary,
      variantField: variant
    }
    const geojson = {
      type: 'Feature',
      geometry: observation.geometry,
      properties: properties
    };

    const featureId = geopackage.addGeoJSONFeatureToGeoPackage(geojson, 'Observations');

    if (observation.properties.forms[0]) {
      // insert the icon link
      let iconId = this.iconMap[observation.properties.forms[0].formId]['icon.png'];

      if (primary && this.iconMap[observation.properties.forms[0].formId][primary]) {
        iconId = this.iconMap[observation.properties.forms[0].formId][primary]['icon.png'];
      }
      if (variant && this.iconMap[observation.properties.forms[0].formId][primary] && this.iconMap[observation.properties.forms[0].formId][primary][variant]) {
        iconId = this.iconMap[observation.properties.forms[0].formId][primary][variant];
      }
      const featureTableStyles = new GeoPackageAPI.FeatureTableStyles(geopackage, 'Observations');
      await featureTableStyles.setIconDefault(featureId, iconId)
    }

    for (let f = 0; f < observation.properties.forms.length; f++) {
      const observationForm = observation.properties.forms[f];
      const formDefinition = this._event.formMap[observationForm.formId];
      primary = observationForm[formDefinition.primaryField];
      variant = observationForm[formDefinition.variantField];
      const formToSave = {
        primaryField: primary,
        variantField: variant,
        formId: observationForm.formId
      };
      const attachments = [];
      if (observation.attachments) {
        observation.attachments.forEach((attachment) => {
          if (attachment.observationFormId.toString() == observationForm._id) {
            attachments.push(attachment);
            observationForm[attachment.fieldName] = observationForm[attachment.fieldName] || []
            observationForm[attachment.fieldName].push(attachment._id.toString());
          }
        })
      }
      Object.keys(observationForm).forEach(key => {
        
        if (observationForm[key] == null) return;
        
        const fieldDefinition = formDefinition.fields.find(field => field.name === key);
        if (!fieldDefinition) return;
        if (fieldDefinition.type === 'multiselectdropdown') {
          formToSave[key] = observationForm[key].join(', ');
        } else if (fieldDefinition.type === 'date') {
          formToSave[key] = moment(observationForm[key]).toISOString();
        } else if (fieldDefinition.type === 'checkbox') {
          formToSave[key] = observationForm[key].toString();
        } else if (fieldDefinition.type === 'geometry') {
          formToSave[key] = wkx.Geometry.parseGeoJSON(observationForm[key]).toWkt();
        } else if (fieldDefinition.type === 'attachment') {
          formToSave[key] = observationForm[key].join(', ');
        } else {
          formToSave[key] = observationForm[key]
        }
      })
      
      try {
        const rowId = geopackage.addAttributeRow('Form_' + formToSave.formId, formToSave);

        if (attachments.length) {
          await this.addAttachments(geopackage, attachments, featureId, 'Form_' + formToSave.formId, rowId);
        }

        const relatedTables = geopackage.relatedTablesExtension;
        await relatedTables.linkRelatedIds('Observations', featureId, 'Form_' + formToSave.formId, rowId, RelationType.ATTRIBUTES);
      }
      catch (e) {
        console.error('error is ', e);
      }
    }
  }
  const featureDao = geopackage.getFeatureDao('Observations');
  const rtreeIndex = new GeoPackageAPI.RTreeIndex(geopackage, featureDao);
  await rtreeIndex.create()
  return geopackage;
}

GeoPackage.prototype.addAttachments = async function (geopackage, attachments, observationId, formTable, formRowId) {
  log.info('Add Attachments');

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];

    await new Promise(function (resolve, reject) {
      fs.readFile(path.join(attachmentBase, attachment.relativePath), async (err, dataBuffer) => {
        if (err) return reject(err);
        const mediaId = geopackage.addMedia('Attachments', dataBuffer, attachment.contentType, {
          name: attachment.name,
          size: attachment.size
        });

        await geopackage.linkMedia('Observations', observationId, 'Attachments', mediaId)
        resolve(geopackage.linkMedia(formTable, formRowId, 'Attachments', mediaId))
      });
    });
  }
}

GeoPackage.prototype.createObservationFeatureTableStyles = async function(geopackage) {
  const featureTableName = 'Observations';
  const featureTableStyles = new GeoPackageAPI.FeatureTableStyles(geopackage, featureTableName);
  await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName)
  await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension()
  await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension()
  await featureTableStyles.createRelationships()
  await this.addObservationIcons(geopackage, featureTableStyles);
  return geopackage;
}

GeoPackage.prototype.createUserFeatureTableStyles = async function(geopackage) {
  const featureTableName = 'Users';
  const featureTableStyles = new GeoPackageAPI.FeatureTableStyles(geopackage, featureTableName);
  await geopackage.featureStyleExtension.getOrCreateExtension(featureTableName)
  await geopackage.featureStyleExtension.getRelatedTables().getOrCreateExtension()
  await geopackage.featureStyleExtension.getContentsId().getOrCreateExtension()
  await featureTableStyles.createRelationships()
  return geopackage;
}

GeoPackage.prototype.addObservationIcons = async function (geopackage, featureTableStyles) {
  const rootDir = path.join(new api.Icon(this._event._id).getBasePath());

  const formDirs = fs.readdirSync(path.join(rootDir));
  for (let i = 0; i < formDirs.length; i++) {
    const formDir = formDirs[i];
    this.iconMap[formDir] = this.iconMap[formDir] || {};
    if (formDir === 'icon.png') {
      await new Promise( (resolve, reject) => {
        fs.readFile(path.join(rootDir, formDir), async (err, iconBuffer) => {
          if (err) return reject(err);
          const iconRow = featureTableStyles.getIconDao().newRow();
          iconRow.data = iconBuffer;
          iconRow.contentType = 'image/png';
          iconRow.name = `${this._event.name} icon`;
          iconRow.description = `Icon for event ${this._event.name}`;
          iconRow.width = 20;
          iconRow.anchorU = 0.5;
          iconRow.anchorV = 1.0;
          this.iconMap[formDir] = iconRow;
          await featureTableStyles.setTableIconDefault(iconRow);
          resolve();
        });
      });
    } else {
      const primaryDirs = fs.readdirSync(path.join(rootDir, formDir));
      for (let p = 0; p < primaryDirs.length; p++) {
        const primaryDir = primaryDirs[p];
        if (primaryDir === 'icon.png') {
          await new Promise( (resolve, reject) => {
            fs.readFile(path.join(rootDir, formDir, primaryDir), (err, iconBuffer) => {
              if (err) return reject(err);
              const iconRow = featureTableStyles.getIconDao().newRow();
              iconRow.data = iconBuffer;
              iconRow.contentType = 'image/png';
              iconRow.name = formDir;
              iconRow.description = `Icon for form ${formDir}/icon.png`;
              iconRow.width = 20;
              iconRow.anchorU = 0.5;
              iconRow.anchorV = 1.0;
              this.iconMap[formDir]['icon.png'] = iconRow;
              resolve();
            });
          });
        } else {
          this.iconMap[formDir][primaryDir] = this.iconMap[formDir][primaryDir] || {};
          const variantDirs = fs.readdirSync(path.join(rootDir, formDir, primaryDir));
          for (let v = 0; v < variantDirs.length; v++) {
            const variantDir = variantDirs[v];
            if (variantDir === 'icon.png') {
              await new Promise( (resolve, reject) => {
                fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir), (err, iconBuffer) => {
                  if (err) return reject(err);
                  const iconRow = featureTableStyles.getIconDao().newRow();
                  iconRow.data = iconBuffer;
                  iconRow.contentType = 'image/png';
                  iconRow.name = primaryDir;
                  iconRow.description = `Icon for form ${formDir}/${primaryDir}/icon.png`;
                  iconRow.width = 20;
                  iconRow.anchorU = 0.5;
                  iconRow.anchorV = 1.0;
                  this.iconMap[formDir][primaryDir]['icon.png'] = iconRow;
                  resolve();
                });
              });
            } else {
              this.iconMap[formDir][primaryDir][variantDir] = this.iconMap[formDir][primaryDir][variantDir] || {};
              await new Promise((resolve, reject) => {
                fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir, 'icon.png'), (err, iconBuffer) => {
                  if (err) return reject(err);
                  const iconRow = featureTableStyles.getIconDao().newRow();
                  iconRow.data = iconBuffer;
                  iconRow.contentType = 'image/png';
                  iconRow.name = variantDir;
                  iconRow.description = `Icon for form ${formDir}/${primaryDir}/${variantDir}/icon.png`;
                  iconRow.width = 20;
                  iconRow.anchorU = 0.5;
                  iconRow.anchorV = 1.0;
                  this.iconMap[formDir][primaryDir][variantDir]['icon.png'] = iconRow;
                  resolve();
                });
              });
            }
          }
        }
      }
    }
  }
  return geopackage;
}
