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
  , os = require('os');

const attachmentBase = environment.attachmentBaseDirectory;

function GeoPackage(options) {
  GeoPackage.super_.call(this, options);
}

util.inherits(GeoPackage, Exporter);
module.exports = GeoPackage;

GeoPackage.prototype.export = function (streamable) {
  log.info('Export the GeoPackage');
  const self = this;

  const downloadedFileName = 'mage-' + self._event.name;

  streamable.type('application/zip');
  streamable.attachment(downloadedFileName + '.zip');

  const archive = archiver('zip');
  archive.pipe(streamable);

  let filePath;

  return this.createGeoPackageFile()
    .then(function (fp) {
      filePath = fp;
      return fp;
    })
    .then(function (fp) {
      return GeoPackageAPI.GeoPackageAPI.create(fp);
    })
    .then(this.createUserTable.bind(this))
    .then(this.addFormDataToGeoPackage.bind(this))
    .then(this.createFormAttributeTables.bind(this))
    .then(this.addObservationIcons.bind(this))
    .then(this.addObservationsToGeoPackage.bind(this))
    .then(this.addLocationsToGeoPackage.bind(this))
    .then(this.addUsersToUsersTable.bind(this))
    .then(function () {
      log.info('GeoPackage created');
      archive.append(fs.createReadStream(filePath), { name: downloadedFileName + '.gpkg' });
      archive.on('end', function () {
        log.info('Removing temporary GeoPackage file: %s', filePath);
        fs.unlink(filePath, function () {
        });
      });
      archive.finalize();
    })
    .catch(function (error) {
      log.info('Error exporting GeoPackage', error);
      throw error;
    });
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
  const self = this;
  self._filter.states = ['active'];

  return new Promise(function (resolve, reject) {
    new api.Observation(self._event).getAll({ filter: self._filter }, function (err, observations) {
      if (err) return reject(err);
      resolve(observations);
    });
  });
}

GeoPackage.prototype.getLocations = function (lastLocationId, startDate, endDate) {
  const self = this;
  const limit = 2000;

  return new Promise(function (resolve, reject) {
    self.requestLocations({ startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit }, function (err, requestedLocations) {
      if (err) return reject(err);
      resolve(requestedLocations);
    });
  });
}

var iconMap = {};

GeoPackage.prototype.createObservationTable = function (geopackage, properties) {
  log.info('Create Observation Table');
  let columns = [];

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
  return geopackage.createFeatureTableFromProperties('Observations', columns);
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

GeoPackage.prototype.createIconTable = function (geopackage) {
  log.info('Create Icon Table');
  const columns = [{
    name: "eventId",
    dataType: "TEXT"
  }, {
    name: "formId",
    dataType: "TEXT"
  }, {
    name: "primary",
    dataType: "TEXT"
  }, {
    name: "variant",
    dataType: "TEXT"
  }];
  return geopackage.createMediaTable('Icons', columns);
}

var locationTablesCreated = {
};

var usersLastLocation = {
};

GeoPackage.prototype.addUsersToUsersTable = function (geopackage) {
  const self = this;
  let userIds = Object.keys(self._users);
  return userIds.reduce(function (sequence, userId) {
    return sequence.then(function () {
      if (!usersLastLocation[userId]) {
        return Promise.resolve();
      }

      const user = self._users[userId];
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
      return new Promise(function (resolve, reject) {
        fs.readFile(path.join(environment.userBaseDirectory, userId, 'icon'), function (err, iconBuffer) {
          if (err) return resolve();
          if (iconBuffer) {
            const iconId = geopackage.addMedia('UserIcons', iconBuffer, user.icon.contentType, user.icon);
            resolve(geopackage.linkMedia('Users', userRowId, 'UserIcons', iconId));
          } else {
            resolve();
          }
        });
      });
    });
  }, Promise.resolve())
    .then(function () {
      return geopackage;
    });
}

GeoPackage.prototype.createLocationTableForUser = function (geopackage, userId) {
  if (locationTablesCreated[userId]) return Promise.resolve();
  let columns = [];

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
  return geopackage.createFeatureTableFromProperties('Locations' + userId, columns);
}

GeoPackage.prototype.addLocationsToGeoPackage = function (geopackage, lastLocationId, startDate, endDate) {
  log.info('Add Locations');
  const self = this;

  startDate = startDate || self._filter.startDate ? moment(self._filter.startDate) : null;
  endDate = endDate || self._filter.endDate ? moment(self._filter.endDate) : null;

  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      return self.getLocations(lastLocationId, startDate, endDate)
        .then(function (locations) {
          if (!locations || locations.length === 0) {
            return resolve();
          }

          const last = locations.slice(-1).pop();
          if (last) {
            const locationTime = moment(last.properties.timestamp);
            lastLocationId = last._id;
            if (!startDate || startDate.isBefore(locationTime)) {
              startDate = locationTime;
            }
          }

          return locations.reduce(function (sequence, location) {
            const user = self._users[location.userId];
            return self.createLocationTableForUser(geopackage, location.userId.toString(), user, location)
              .then(function () {
                return sequence.then(function () {
                  usersLastLocation[location.userId.toString()] = location;
                  let properties = {};
                  properties.userId = location.userId.toString();

                  let geojson = {
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
                  const featureId = geopackage.addGeoJSONFeatureToGeoPackage(geojson, 'Locations' + location.userId.toString());
                });
              });
          }, Promise.resolve())
            .then(function () {
              return resolve(self.addLocationsToGeoPackage(geopackage, lastLocationId, startDate, endDate));
            });
        });
    });
  })
    .then(function () {
      return geopackage;
    });
}

GeoPackage.prototype.createFormAttributeTables = function (geopackage) {
  const self = this;

  log.info('Create Form Attribute Tables');
  return Object.keys(self._event.formMap).reduce(function (sequence, formId) {
    let columns = [];
    const form = self._event.formMap[formId];
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
        dataType: 'TEXT'
      });
    }
    return geopackage.createAttributeTable('Form_' + formId, columns);
  }, Promise.resolve())
    .then(function () {
      return geopackage;
    });
}

GeoPackage.prototype.createUserTable = function (geopackage) {
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
  return geopackage.createFeatureTableFromProperties('Users', columns)
    .then(function () {
      log.info('Create User Icon Table');
      const columns = [{
        name: "type",
        dataType: "TEXT"
      }, {
        name: "text",
        dataType: "TEXT"
      }, {
        name: "color",
        dataType: "TEXT"
      }];
      return geopackage.createMediaTable('UserIcons', columns);
    })
    .then(function () {
      log.info('Create User Avatar Table');
      return geopackage.createMediaTable('UserAvatars');
    })
    .then(function () {
      return geopackage;
    });
}

GeoPackage.prototype.addFormDataToGeoPackage = function (geopackage) {
  const self = this;

  let columns = [];
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

  return geopackage.createAttributeTable('Forms', columns)
    .then(function (dao) {
      for (let formId in self._event.formMap) {
        const form = self._event.formMap[formId];
        const row = {
          formName: form.name,
          primaryField: form.primaryField,
          variantField: form.variantField,
          color: form.color,
          formId: formId
        };

        geopackage.addAttributeRow('Forms', row);
      }
    })
    .then(function () {
      return geopackage;
    });
}

GeoPackage.prototype.addObservationsToGeoPackage = function (geopackage) {
  log.info('Add Observations');
  const self = this;
  return this.getObservations()
    .then(function (observations) {
      const firstObs = observations[0];
      return self.createObservationTable(geopackage, {

      })
        .then(function () {
          self.createAttachmentTable(geopackage);
        })
        .then(function () {
          return observations.reduce(function (sequence, observation) {
            return sequence.then(function () {

              let primary;
              let variant;

              if (observation.properties.forms[0]) {
                const form = self._event.formMap[observation.properties.forms[0].formId];
                primary = observation.properties.forms[0][form.primaryField];
                variant = observation.properties.forms[0][form.variantField];
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

              let promise;

              if (observation.properties.forms[0]) {
                // insert the icon link
                const iconId = iconMap[observation.properties.forms[0].formId]['icon.png'];
                if (primary) {
                  iconId = iconMap[observation.properties.forms[0].formId][primary]['icon.png'];
                }
                if (variant) {
                  iconId = iconMap[observation.properties.forms[0].formId][primary][variant];
                }
                promise = geopackage.linkMedia('Observations', featureId, 'Icons', iconId);
              } else {
                promise = Promise.resolve();
              }

              return promise
                .then(function () {
                  // insert all attachments and link them
                  if (observation.attachments) {
                    return self.addAttachments(geopackage, observation.attachments, featureId);
                  }
                })
                .then(function () {
                  // insert all of the forms as linked attribute tables
                  return observation.properties.forms.reduce(function (sequence, form) {
                    return sequence.then(function () {
                      form.primaryField = primary;
                      form.variantField = variant;
                      form.formId = form.formId.toString();
                      const rowId = geopackage.addAttributeRow('Form_' + form.formId, form);
                      const relatedTables = geopackage.getRelatedTablesExtension();
                      return relatedTables.linkRelatedIds('Observations', featureId, 'Form_' + form.formId, rowId, {
                        name: 'simple_attributes',
                        dataType: 'ATTRIBUTES'
                      });
                    });
                  }, Promise.resolve());
                });
            });
          }, Promise.resolve());
        });
    })
    .then(function () {
      return geopackage;
    });
}

GeoPackage.prototype.addAttachments = function (geopackage, attachments, observationId) {
  log.info('Add Attachments');

  return attachments.reduce(function (sequence, attachment) {
    return sequence.then(function () {
      return new Promise(function (resolve, reject) {
        fs.readFile(path.join(attachmentBase, attachment.relativePath), function (err, dataBuffer) {
          if (err) return reject(err);
          const mediaId = geopackage.addMedia('Attachments', dataBuffer, attachment.contentType, {
            name: attachment.name,
            size: attachment.size
          });

          resolve(geopackage.linkMedia('Observations', observationId, 'Attachments', mediaId));
        });
      });
    });
  }, Promise.resolve());
}

GeoPackage.prototype.addObservationIcons = function (geopackage) {
  const self = this;

  const rootDir = path.join(new api.Icon(self._event._id).getBasePath());

  log.info('Add Icons', rootDir);
  this.createIconTable(geopackage);

  let formDirs = fs.readdirSync(path.join(rootDir));
  return formDirs.reduce(function (formSequence, formDir) {
    return formSequence.then(function () {
      iconMap[formDir] = iconMap[formDir] || {};
      if (formDir === 'icon.png') {
        return new Promise(function (resolve, reject) {
          fs.readFile(path.join(rootDir, formDir), function (err, iconBuffer) {
            if (err) return reject(err);
            const iconId = geopackage.addMedia('Icons', iconBuffer, 'image/png', {
              formId: formDir
            });
            iconMap[formDir] = iconId;
            resolve();
          });
        });
      } else {
        const primaryDirs = fs.readdirSync(path.join(rootDir, formDir));
        return primaryDirs.reduce(function (primarySequence, primaryDir) {
          return primarySequence.then(function () {
            if (primaryDir === 'icon.png') {
              return new Promise(function (resolve, reject) {
                fs.readFile(path.join(rootDir, formDir, primaryDir), function (err, iconBuffer) {
                  if (err) return reject(err);
                  const iconId = geopackage.addMedia('Icons', iconBuffer, 'image/png', {
                    formId: formDir
                  });
                  iconMap[formDir]['icon.png'] = iconId;
                  resolve();
                });
              });
            } else {
              iconMap[formDir][primaryDir] = iconMap[formDir][primaryDir] || {};
              const variantDirs = fs.readdirSync(path.join(rootDir, formDir, primaryDir));
              return variantDirs.reduce(function (variantSequence, variantDir) {
                return variantSequence.then(function () {
                  if (variantDir === 'icon.png') {
                    return new Promise(function (resolve, reject) {
                      fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir), function (err, iconBuffer) {
                        if (err) return reject(err);
                        const iconId = geopackage.addMedia('Icons', iconBuffer, 'image/png', {
                          formId: formDir,
                          primary: primaryDir
                        });
                        iconMap[formDir][primaryDir]['icon.png'] = iconId;
                        resolve();
                      });
                    });
                  } else {
                    return new Promise(function (resolve, reject) {
                      fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir, 'icon.png'), function (err, iconBuffer) {
                        if (err) return reject(err);
                        const iconId = geopackage.addMedia('Icons', iconBuffer, 'image/png', {
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
    .then(function () {
      return geopackage;
    });
}
