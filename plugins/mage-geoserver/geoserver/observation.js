const async = require('async')
  , request = require('request')
  , util = require('util')
  , log = require('winston')
  , geoserverConfig = require('../config').geoserver
  , mapper = require('./attributeMapper')
  , SchemaModel = require('../models/schema');

const geoserverRequest = request.defaults({
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
      const descriptors = mapper.descriptorsForEvent(event);
      SchemaModel.updateAttributeDescriptors(event, descriptors, done);
    },
    function(done) {
      const layer = {
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
          cqlFilter: "\"event_id\" = " + event._id,
          attributes: mapper.attributesForEvent(event),
          metadata: {
            entry: [{
              '@key': 'time',
              dimensionInfo: {
                enabled: true,
                attribute: 'timestamp',
                presentation: 'LIST',
                units: 'ISO8601',
                defaultValue: {
                  'strategy': 'MINIMUM'
                },
                nearestMatchEnabled: false
              }
            }]
          }
        }
      };
      geoserverRequest.put({
        url: util.format('workspaces/%s/datastores/%s/featuretypes/%s', geoserverConfig.workspace, geoserverConfig.datastore, 'observations' + event._id),
        body: layer
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

  geoserverRequest.delete({
    url: util.format('workspaces/%s/datastores/%s/featuretypes/%s?recurse=true', geoserverConfig.workspace, geoserverConfig.datastore, 'observations' + event._id),
  }, function(err, response) {
    if (err || response.statusCode !== 200) {
      log.error('Failed to delete geoserver observation layer for event ' + event.name, err);
    } else {
      log.info('Deleted geoserver observation layer for event ' + event.name);
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

    const layer = body ? body.featureType : null;
    callback(err, layer);
  });
}

function createLayer(event, callback) {
  log.info('Creating geoserver observation layer %s.', event.name);

  // Geoserver expects that the collection exists for the created,
  // this will ensure that the observation collection exists
  require('../models/observation');

  async.series([
    function(done) {
      const schema = {
        typeName: 'observations' + event._id,
        userData: {
          collection: 'observations'
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
        attributeDescriptors: mapper.descriptorsForEvent(event)
      };

      SchemaModel.createSchema(schema, done);
    },
    function(done) {
      // TODO add time dimension
      const layer =  {
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
            name: 'mage:mage'
          },
          cqlFilter: "\"event_id\" = " + event._id,
          attributes: mapper.attributesForEvent(event)
          // TODO disable WMS time for now, geoserver support is lacking
          // metadata: {
          //   entry: [{
          //     '@key': 'time',
          //     dimensionInfo: {
          //       enabled: true,
          //       attribute: 'timestamp',
          //       presentation: 'LIST',
          //       units: 'ISO8601',
          //       defaultValue: {
          //         'strategy': 'MINIMUM'
          //       },
          //       nearestMatchEnabled: false
          //     }
          //   }]
          // }
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
