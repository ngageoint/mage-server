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

exports.createLayer = function(event) {
  log.info('Creating geoserver layer for event', event.name);

  async.series([
    function(done) {
      ObservationModel.createCollection(event, done);
    },
    function(done) {
      var descriptors = createAttributeDescriptors(event);
      SchemaModel.createSchema(event, descriptors, done);
    },
    function(done) {
      geoserverRequest.post({
        url: util.format('workspaces/%s/datastores/%s/featuretypes', geoserverConfig.namespace, geoserverConfig.datastore),
        body: createLayer(event)
      }, function(err, response) {
        if (err || response.statusCode !== 201) {
          log.error('Failed to create geoserver layer for event ' + event.name, err);
        } else {
          log.info('Created geoserver layer for event ' + event.name);
        }

        done(err);
      });
    }
  ], function(err) {
    if (err) {
      log.error('Error creating geoserver layer', err);
    }
  });
};

exports.updateLayer = function(event) {
  log.info('Updating geoserver layer for event', event.name);

  async.parallel([
    function(done) {
      var descriptors = createAttributeDescriptors(event);
      console.log('creating/updating schemas attribute descriptors', descriptors);
      SchemaModel.updateAttributeDescriptors(event, descriptors, done);
    },
    function(done) {
      geoserverRequest.put({
        url: util.format('workspaces/%s/datastores/%s/featuretypes/%s', geoserverConfig.namespace, geoserverConfig.datastore, 'observations' + event._id),
        body: createLayer(event)
      }, function(err, response) {
        if (err || response.statusCode !== 200) {
          log.error('Failed to update geoserver layer for event ' + event.name, err);
        } else {
          log.info('Updated geoserver layer for event ' + event.name);
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
  log.info('Removing geoserver layer for event', event.name);

  async.series([
    function(done) {
      geoserverRequest.delete({
        url: util.format('workspaces/%s/datastores/%s/featuretypes/%s?recurse=true', geoserverConfig.namespace, geoserverConfig.datastore, 'observations' + event._id),
      }, function(err, response) {
        if (err || response.statusCode !== 200) {
          log.error('Failed to delete geoserver layer for event ' + event.name, err);
        } else {
          log.info('Deleted geoserver layer for event ' + event.name);
        }

        done();
      });
    },
    function(done) {
      ObservationModel.removeCollection(event, done);
    }
  ], function(err) {
    if (err) {
      log.error('Error removing layer', err);
    }
  });
};

function createLayer(event) {
  var layer =  {
    featureType: {
      name: 'observations' + event._id,
      title: event.name,
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
      attributes: {
        attribute: [{
          name: 'geometry',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'com.vividsolutions.jts.geom.Geometry'
        },{
          name: 'properties.event._id',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.Integer'
        },{
          name: 'properties.event.name',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: "java.lang.String"
        },{
          name: 'properties.user.username',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        },{
          name: 'properties.user.displayName',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        }]
      }
    }
  };

  Array.prototype.push.apply(layer.featureType.attributes.attribute, mapper.attributesFromForm(event.form));

  return layer;
}

function createAttributeDescriptors(event) {
  var descriptors = [{
    localName: 'geometry',
    type: {
      binding: 'com.vividsolutions.jts.geom.Geometry'
    },
    userData: {
      mapping: 'geometry',
      encoding: "GeoJSON"
    }
  },{
    localName: 'properties.event._id',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.Integer'
    },
    userData: {
      mapping: 'properties.event._id'
    }
  },{
    localName: 'properties.event.name',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.event.name'
    }
  },{
    localName: 'properties.user.username',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.user.username'
    }
  },{
    localName: 'properties.user.displayName',
    minOccurs: 0,
    maxOccurs: 1,
    type: {
      binding: 'java.lang.String'
    },
    userData: {
      mapping: 'properties.user.displayName'
    }
  }];

  Array.prototype.push.apply(descriptors, mapper.descriptorsFromForm(event.form));

  return descriptors;
}
