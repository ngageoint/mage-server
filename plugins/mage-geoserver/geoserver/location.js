var async = require('async')
  , request = require('request')
  , util = require('util')
  , log = require('winston')
  , geoserverConfig = require('../config').geoserver
  , SchemaModel = require('../models/schema')
  , LocationModel = require('../models/location');

var geoserverRequest = request.defaults({
  json: true,
  auth: {
    'username': geoserverConfig.username,
    'password': geoserverConfig.password
  },
  baseUrl: geoserverConfig.url + '/geoserver/rest'
});

exports.createLayer = function(event, callback) {
  log.info('Creating geoserver location layer for event', event.name);

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

exports.removeLayer = function(event) {
  log.info('Removing geoserver location layer for event', event.name);

  async.series([
    function(done) {
      geoserverRequest.delete({
        url: util.format('workspaces/%s/datastores/%s/featuretypes/%s?recurse=true', geoserverConfig.workspace, geoserverConfig.datastore, 'locations' + event._id),
      }, function(err, response) {
        if (err || response.statusCode !== 200) {
          log.error('Failed to delete geoserver location layer for event ' + event.name, err);
        } else {
          log.info('Deleted geoserver location layer for event ' + event.name);
        }

        done();
      });
    },
    function(done) {
      LocationModel.removeLocations(event, done);
    }
  ], function(err) {
    if (err) {
      log.error('Error removing geoserver location layer', err);
    }
  });
};

function createSchema(event) {
  return {
    typeName: 'locations' + event._id,
    userData: {
      collection: 'locations'
    },
    geometryDescriptor: {
      localName: 'geometry',
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:EPSG:4326'
        }
      }
    },
    attributeDescriptors: [{
      localName : "geometry",
      type : {
        binding : "com.vividsolutions.jts.geom.Geometry"
      },
      userData : {
        encoding : "GeoJSON",
        mapping : "geometry"
      }
    },{
      localName : "properties.event.name",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.event.name"
      }
    },{
      localName : "properties.event._id",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.Integer"
      },
      userData : {
        mapping : "properties.event._id"
      }
    },{
      localName : "properties.user._id",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user._id"
      }
    },{
      localName : "properties.user.displayName",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user.displayName"
      }
    },{
      localName : "properties.user.username",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user.username"
      }
    },{
      localName : "properties.accuracy",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.Integer"
      },
      userData : {
        mapping : "properties.accuracy"
      }
    },{
      localName : "properties.timestamp",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.util.Date"
      },
      userData : {
        mapping : "properties.timestamp"
      }
    }]
  };
}

function getLayer(event, callback) {
  geoserverRequest.get({
    url: util.format('workspaces/%s/datastores/%s/featuretypes/%s', geoserverConfig.workspace, geoserverConfig.datastore, 'locations' + event._id),
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    var layer = body ? body.featureType : null;
    callback(err, layer);
  });
}

function createLayer(event, callback) {
  log.info('Creating geoserver location layer for event', event.name);

  async.series([
    function(done) {
      LocationModel.createCollection(event, done);
    },
    function(done) {
      var schema = createSchema(event);
      SchemaModel.createSchema(schema, done);
    },
    function(done) {
      geoserverRequest.post({
        url: util.format('workspaces/%s/datastores/%s/featuretypes', geoserverConfig.workspace, geoserverConfig.datastore),
        body: createLayerBody(event)
      }, function(err, response) {
        if (err || response.statusCode !== 201) {
          log.error('Failed to create geoserver location layer for event ' + event.name, err);
        } else {
          log.info('Created geoserver location layer for event ' + event.name);
        }

        done(err);
      });
    }
  ], function(err) {
    if (err) {
      log.error('Error creating geoserver location layer', err);
    }

    callback(err);
  });
}

function createLayerBody(event) {
  var layer =  {
    featureType: {
      name: 'locations' + event._id,
      title: event.name + ' Locations',
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
      cqlFilter: "\"properties.event._id\" = " + event._id,
      attributes: {
        attribute: [{
          name: 'geometry',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'com.vividsolutions.jts.geom.Geometry'
        },{
          name: 'properties.timestamp',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.util.Date'
        },{
          name: 'properties.accuracy',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.Integer'
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
          binding: 'java.lang.String'
        },{
          name: 'properties.user._id',
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
        },{
          name: 'properties.user.username',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        }]
      }
    }
  };

  return layer;
}
