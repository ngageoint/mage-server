var async = require('async')
  , request = require('request')
  , util = require('util')
  , log = require('winston')
  , geoserverConfig = require('../config').geoserver
  , mapper = require('./attributeMapper')
  , SchemaModel = require('../models/schema')
  , ObservationModel = require('../models/observation');

var geoserverRequest = request.defaults({
  json: true,
  auth: {
    'username': geoserverConfig.username,
    'password': geoserverConfig.password
  },
  baseUrl: geoserverConfig.url + '/geoserver/rest'
});

exports.createLayer = function(event, callback) {
  log.info('Creating geoserver observation layer for event', event.name);

  getLayer(event, function(err, layer) {
    if (err) return callback(err);

    if (layer) {
      log.info('Geoserver layer "%s:" already exists', layer.name);
      return callback(err, layer);
    }

    createLayer(event, function(err) {
      if (callback) {
        callback(err);
      }
    });
  });
};

exports.updateLayer = function(event) {
  log.info('Updating geoserver observation layer for event', event.name);

  async.parallel([
    function(done) {
      var descriptors = mapper.descriptorsFromForm(event.form);
      SchemaModel.updateAttributeDescriptors(event, descriptors, done);
    },
    function(done) {
      geoserverRequest.put({
        url: util.format('workspaces/%s/datastores/%s/featuretypes/%s', geoserverConfig.workspace, geoserverConfig.datastore, 'observations' + event._id),
        body: createLayer(event)
      }, function(err, response) {
        if (err || response.statusCode !== 200) {
          log.error('Failed to update geoserver observation layer for event ' + event.name, err);
        } else {
          log.info('Updated geoserver observation layer for event ' + event.name);
        }

        done(err);
      });
    }
  ], function(err) {
    if (err) {
      log.error('Error updating schema and feature type in geoserver for event ' + event.name);
    }
  });
};

exports.removeLayer = function(event) {
  log.info('Removing geoserver observation layer for event', event.name);

  async.series([
    function(done) {
      geoserverRequest.delete({
        url: util.format('workspaces/%s/datastores/%s/featuretypes/%s?recurse=true', geoserverConfig.workspace, geoserverConfig.datastore, 'observations' + event._id),
      }, function(err, response) {
        if (err || response.statusCode !== 200) {
          log.error('Failed to delete geoserver observation layer for event ' + event.name, err);
        } else {
          log.info('Deleted geoserver observation layer for event ' + event.name);
        }

        done();
      });
    },
    function(done) {
      ObservationModel.removeCollection(event, done);
    }
  ], function(err) {
    if (err) {
      log.error('Error removing geoserver observation layer', err);
    }
  });
};

function getLayer(event, callback) {
  geoserverRequest.get({
    url: util.format('workspaces/%s/datastores/%s/featuretypes/%s', geoserverConfig.workspace, geoserverConfig.datastore, 'observations' + event._id),
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    var layer = body ? body.featureType : null;
    callback(err, layer);
  });
}

function createLayer(event, callback) {
  log.info('Creating geoserver observation layer %s.', event.name);

  async.series([
    function(done) {
      ObservationModel.createCollection(event, done);
    },
    function(done) {
      var schema = {
        typeName: 'observations' + event._id,
        userData: {
          collection: 'observations' + event._id
        },
        geometryDescriptor: {
          localName: "geometry",
          crs: {
            type: "name",
            properties: {
              name: "urn:ogc:def:crs:EPSG:4326"
            }
          }
        },
        attributeDescriptors: mapper.descriptorsFromForm(event.form)
      };

      SchemaModel.createSchema(schema, done);
    },
    function(done) {
      var layer =  {
        featureType: {
          name: 'observations' + event._id,
          title: event.name + ' Observations',
          nativeCRS: 'EPSG:4326',
          srs: 'EPSG:4326',
          nativeBoundingBox: {
            minx: -180,
            maxx: 180,
            miny: -90,
            maxy: 90,
            crs: 'EPSG:4326'
          },
          latLonBoundingBox: {
            minx: -180,
            maxx: 180,
            miny: -90,
            maxy: 90,
            crs: 'EPSG:4326'
          },
          projectionPolicy: 'FORCE_DECLARED',
          store: {
            name: 'cite:mage'
          },
          attributes: mapper.attributesFromForm(event.form)
        }
      };

      geoserverRequest.post({
        url: util.format('workspaces/%s/datastores/%s/featuretypes', geoserverConfig.workspace, geoserverConfig.datastore),
        body: layer
      }, function(err, response) {
        if (err || response.statusCode !== 201) {
          log.error('Failed to create geoserver observation layer for event ' + event.name, err);
        } else {
          log.info('Created geoserver observation layer for event ' + event.name);
        }

        done(err);
      });
    }
  ], function(err) {
    if (err) {
      log.error('Error creating geoserver observation layer', err);
    }

    callback(err);
  });
}
