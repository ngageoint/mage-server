var util = require('util')
  , fs = require('fs')
  , api = require('../api')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , path = require('path')
  , Exporter = require('./exporter')
  , GeoPackageAPI = require('@ngageoint/geopackage')
  , environment = require('../environment/env')
  , os = require('os');

var userBase = environment.userBaseDirectory;
var attachmentBase = environment.attachmentBaseDirectory;

function GeoPackage(options) {
  GeoPackage.super_.call(this, options);
}

util.inherits(GeoPackage, Exporter);
module.exports = GeoPackage;

GeoPackage.prototype.export = function(streamable) {
  log.info('Export the GeoPackage');
  var self = this;

  var downloadedFileName = 'mage-' + self._event.name;

  streamable.type('application/zip');
  streamable.attachment(downloadedFileName + '.zip');

  var archive = archiver('zip');
  archive.pipe(streamable);

  var filePath;

  return this.createGeoPackageFile()
  .then(function(fp) {
    filePath = fp;
    return fp;
  })
  .then(GeoPackageAPI.create)
  .then(this.createUserTable.bind(this))
  .then(this.addFormDataToGeoPackage.bind(this))
  .then(this.createFormAttributeTables.bind(this))
  .then(this.addObservationIcons.bind(this))
  .then(this.addObservationsToGeoPackage.bind(this))
  .then(this.addLocationsToGeoPackage.bind(this))
  .then(this.addUsersToUsersTable.bind(this))
  .then(function(){
    log.info('GeoPackage created');
    archive.append(fs.createReadStream(filePath), {name: downloadedFileName + '.gpkg'});
    archive.on('end', function(){
      log.info('Removing temporary GeoPackage file: %s', filePath);
      fs.unlink(filePath, function() {
      });
    });
    archive.finalize();
  })
  .catch(function(error) {
    log.info('Error exporting GeoPackage', error);
    fs.unlink(filePath, function() {
    });
    throw error;
  });
};

GeoPackage.prototype.createGeoPackageFile = function() {
  log.info('Create GeoPackage File');
  var filename = moment().format('YYYMMDD_hhmmssSSS') + '.gpkg';
  var filePath = path.join(os.tmpdir(), filename);
  return new Promise(function(resolve, reject) {
    fs.unlink(filePath, function() {
      fs.mkdir(path.dirname(filePath), function() {
        fs.open(filePath, 'w', function(err) {
          if (err) return reject(err);
          resolve(filePath);
        });
      });
    });
  });
}

GeoPackage.prototype.getObservations = function() {
  var self = this;
  self._filter.states = ['active'];

  return new Promise(function(resolve, reject) {
    new api.Observation(self._event).getAll({filter: self._filter}, function(err, observations) {
      resolve(observations);
    });
  });

  return observationsGeoJson.features;
}

GeoPackage.prototype.getLocations = function(lastLocationId, startDate, endDate) {
  var self = this;
  var limit = 2000;

  return new Promise(function(resolve, reject) {
    self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
      resolve(requestedLocations);
    });
  });
}

var iconMap = {};

GeoPackage.prototype.createObservationTable = function(geopackage, properties) {
  log.info('Create Observation Table');
  var columns = [];

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
  return GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Observations', columns);
}

GeoPackage.prototype.createAttachmentTable = function(geopackage) {
  log.info('Create Attachment Table');
  var columns = [{
    name: "name",
    dataType: "TEXT"
  },{
    name: "size",
    dataType: "REAL"
  }];
  return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'Attachments', columns);
}

GeoPackage.prototype.createIconTable = function(geopackage) {
  log.info('Create Icon Table');
  var columns = [{
    name: "eventId",
    dataType: "TEXT"
  },{
    name: "formId",
    dataType: "TEXT"
  },{
    name: "primary",
    dataType: "TEXT"
  },{
    name: "variant",
    dataType: "TEXT"
  }];
  return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'Icons', columns);
}

var locationTablesCreated = {
};

var usersLastLocation = {
};

GeoPackage.prototype.addUsersToUsersTable = function(geopackage) {
  var self = this;
  var userIds = Object.keys(self._users);
  return userIds.reduce(function(sequence, userId) {
    return sequence.then(function() {
      if (!usersLastLocation[userId]) {
        return Promise.resolve();
      }

      var user = self._users[userId];
      var geoJson = {
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
      var userRowId = GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geoJson, 'Users')
      return new Promise(function (resolve, reject) {
        fs.readFile(path.join(environment.userBaseDirectory, userId, 'icon'), function(err, iconBuffer) {
          var iconId = GeoPackageAPI.addMedia(geopackage, 'UserIcons', iconBuffer, user.icon.contentType, user.icon);
          resolve(GeoPackageAPI.linkMedia(geopackage, 'Users', userRowId, 'UserIcons', iconId));
        });
      });
    });
  }, Promise.resolve())
  .then(function() {
    return geopackage;
  });
}

GeoPackage.prototype.createLocationTableForUser = function(geopackage, userId) {
  if (locationTablesCreated[userId]) return Promise.resolve();
  var columns = [];

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

  locationTablesCreated[userId] = true;
  return GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Locations'+userId, columns)
  .catch(function(err) {
  });
}

GeoPackage.prototype.addLocationsToGeoPackage = function(geopackage, lastLocationId, startDate, endDate) {
  log.info('Add Locations');
  var self = this;

  startDate = startDate || self._filter.startDate ? moment(self._filter.startDate) : null;
  endDate = endDate || self._filter.endDate ? moment(self._filter.endDate) : null;

  return new Promise(function(resolve, reject) {
    setTimeout(function(){
      return self.getLocations(lastLocationId, startDate, endDate)
      .then(function(locations) {
        if (!locations || locations.length === 0) {
          return resolve();
        }

        var last = locations.slice(-1).pop();
        if (last) {
          var locationTime = moment(last.properties.timestamp);
          lastLocationId = last._id;
          if (!startDate || startDate.isBefore(locationTime)) {
            startDate = locationTime;
          }
        }

        return locations.reduce(function(sequence, location) {
          var user = self._users[location.userId];
          return self.createLocationTableForUser(geopackage, location.userId.toString(), user, location)
          .then(function() {
            return sequence.then(function() {
              usersLastLocation[location.userId.toString()] = location;
              var properties = {};
              properties.userId = location.userId.toString();

              var geojson = {
                type:'Feature',
                geometry: location.geometry,
                properties: location.properties
              };
              geojson.properties.mageId = location._id.toString();
              geojson.properties.userId = location.userId.toString();
              geojson.properties.deviceId = location.properties.deviceId.toString();

              if (geojson.properties.id) {
                delete geojson.properties.id;
              }
              var featureId = GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geojson, 'Locations'+location.userId.toString());
            });
          });
        }, Promise.resolve())
        .then(function() {
          return resolve(self.addLocationsToGeoPackage(geopackage, lastLocationId, startDate, endDate));
        });
      });
    });
  })
  .then(function() {
    return geopackage;
  });
}

GeoPackage.prototype.createFormAttributeTables = function(geopackage) {
  var self = this;

  log.info('Create Form Attribute Tables');
  return Object.keys(self._event.formMap).reduce(function(sequence, formId) {
    var columns = [];
    var form = self._event.formMap[formId];
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
      dataType: 'TEXT',
      default: formId
    });
    for (var i = 0; i < form.fields.length; i++) {
      var field = form.fields[i];
      columns.push({
        dataColumn: {
          column_name: field.name,
          table_name: 'Form_'+formId,
          name: field.title,
          title: field.title
        },
        name: field.name,
        dataType: 'TEXT'
      });
    }
    return GeoPackageAPI.createAttributeTableWithProperties(geopackage, 'Form_'+formId, columns);
  }, Promise.resolve())
  .then(function() {
    return geopackage;
  });
}

GeoPackage.prototype.createUserTable = function(geopackage) {
  var columns = [];
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
  return GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Users', columns)
  .then(function() {
    log.info('Create User Icon Table');
    var columns = [{
      name: "type",
      dataType: "TEXT"
    },{
      name: "text",
      dataType: "TEXT"
    },{
      name: "color",
      dataType: "TEXT"
    }];
    return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'UserIcons', columns);
  })
  .then(function() {
    log.info('Create User Avatar Table');
    return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'UserAvatars');
  })
  .then(function() {
    return geopackage;
  });
}

GeoPackage.prototype.addFormDataToGeoPackage = function(geopackage) {
  var self = this;

  var columns = [];
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

  return GeoPackageAPI.createAttributeTableWithProperties(geopackage, 'Forms', columns)
  .then(function(dao) {
    for (var formId in self._event.formMap) {
      var form = self._event.formMap[formId];
      var row = {
        formName: form.name,
        primaryField: form.primaryField,
        variantField: form.variantField,
        color: form.color,
        formId: formId
      };

      GeoPackageAPI.addAttributeRow(geopackage, 'Forms', row);
    }
  })
  .then(function() {
    return geopackage;
  });
}

GeoPackage.prototype.addObservationsToGeoPackage = function(geopackage) {
  log.info('Add Observations');
  var self = this;
  return this.getObservations()
  .then(function(observations) {
    var firstObs = observations[0];
    return self.createObservationTable(geopackage, {

    })
    .then(function() {
      self.createAttachmentTable(geopackage);
    })
    .then(function() {
      return observations.reduce(function(sequence, observation) {
        return sequence.then(function() {

          var form = self._event.formMap[observation.properties.forms[0].formId];
          var primary = observation.properties.forms[0][form.primaryField];
          var variant = observation.properties.forms[0][form.variantField];

          var properties = {
            lastModified: observation.lastModified,
            timestamp: observation.properties.timestamp,
            mageId: observation._id.toString(),
            userId: observation.userId.toString(),
            deviceId: observation.deviceId.toString(),
            createdAt: observation.createdAt,
            primaryField: primary,
            variantField: variant
          }
          var geojson = {
            type:'Feature',
            geometry: observation.geometry,
            properties: properties
          };

          var featureId = GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geojson, 'Observations');
          // insert the icon link
          var iconId = iconMap[observation.properties.forms[0].formId]['icon.png'];
          if (primary) {
            iconId = iconMap[observation.properties.forms[0].formId][primary]['icon.png'];
          }
          if (variant) {
            iconId = iconMap[observation.properties.forms[0].formId][primary][variant];
          }
          return GeoPackageAPI.linkMedia(geopackage, 'Observations', featureId, 'Icons', iconId)
          .then(function() {
            // insert all attachments and link them
            if (observation.attachments) {
              return self.addAttachments(geopackage, observation.attachments, featureId);
            }
          })
          .then(function() {
            // insert all of the forms as linked attribute tables
            return observation.properties.forms.reduce(function(sequence, form) {
              return sequence.then(function() {
                form.primaryField = primary;
                form.variantField = variant;
                form.formId = form.formId.toString();
                var rowId = GeoPackageAPI.addAttributeRow(geopackage, 'Form_'+form.formId, form);
                var relatedTables = geopackage.getRelatedTablesExtension();
                return relatedTables.linkRelatedIds('Observations', featureId, 'Form_'+form.formId, rowId, {
                  name: 'simple_attributes',
                  dataType: 'ATTRIBUTES'
                });
              });
            }, Promise.resolve());
          });
        });
      }, Promise.resolve())
      .catch(function(error){
        log.error('error', error);
      });
    });
  })
  .then(function() {
    return geopackage;
  });
}

GeoPackage.prototype.addAttachments = function(geopackage, attachments, observationId) {
  log.info('Add Attachments');

  return attachments.reduce(function(sequence, attachment) {
    return sequence.then(function() {
      return new Promise(function(resolve, reject) {
        fs.readFile(path.join(attachmentBase, attachment.relativePath), function(err, dataBuffer) {
          var mediaId = GeoPackageAPI.addMedia(geopackage, 'Attachments', dataBuffer, attachment.contentType, {
            name: attachment.name,
            size: attachment.size
          });

          resolve(GeoPackageAPI.linkMedia(geopackage, 'Observations', observationId, 'Attachments', mediaId));
        });
      });
    });
  }, Promise.resolve());
}

GeoPackage.prototype.addObservationIcons = function(geopackage) {
  var self = this;

  var rootDir = path.join(new api.Icon(self._event._id).getBasePath());

  log.info('Add Icons', rootDir);
  this.createIconTable(geopackage);

  var formDirs = fs.readdirSync(path.join(rootDir));
  return formDirs.reduce(function(formSequence, formDir) {
    return formSequence.then(function() {
      iconMap[formDir] = iconMap[formDir] || {};
      if (formDir === 'icon.png') {
        return new Promise(function(resolve, reject) {
          fs.readFile(path.join(rootDir, formDir), function(err, iconBuffer) {
            var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
              formId: formDir
            });
            iconMap[formDir] = iconId;
            resolve();
          });
        });
      } else {
        var primaryDirs = fs.readdirSync(path.join(rootDir, formDir));
        return primaryDirs.reduce(function(primarySequence, primaryDir) {
          return primarySequence.then(function() {
            if (primaryDir === 'icon.png') {
              return new Promise(function(resolve, reject) {
                fs.readFile(path.join(rootDir, formDir, primaryDir), function(err, iconBuffer) {
                  var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                    formId: formDir
                  });
                  iconMap[formDir]['icon.png'] = iconId;
                  resolve();
                });
              });
            } else {
              iconMap[formDir][primaryDir] = iconMap[formDir][primaryDir] || {};
              var variantDirs = fs.readdirSync(path.join(rootDir, formDir, primaryDir));
              return variantDirs.reduce(function(variantSequence, variantDir) {
                return variantSequence.then(function() {
                  if (variantDir === 'icon.png') {
                    return new Promise(function(resolve, reject) {
                      fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir), function(err, iconBuffer) {
                        var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                          formId: formDir,
                          primary: primaryDir
                        });
                        iconMap[formDir][primaryDir]['icon.png'] = iconId;
                        resolve();
                      });
                    });
                  } else {
                    return new Promise(function(resolve, reject) {
                      fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir, 'icon.png'), function(err, iconBuffer) {
                        var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                          formId: formDir,
                          primary: primaryDir,
                          variant: variantDir
                        });
                        iconMap[formDir][primaryDir][variantDir] = iconId;
                        resolve();
                      });
                    });
                  }
                });
              }, Promise.resolve());
            }
          });
        }, Promise.resolve());
      }
    });
  }, Promise.resolve())
  .then(function() {
    return geopackage;
  });
}
