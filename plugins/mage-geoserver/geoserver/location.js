var async = require('async')
  , request = require('request')
  , util = require('util')
  , log = require('winston')
  , geoserverConfig = require('../config').geoserver
  , SchemaModel = require('../models/schema');

var geoserverRequest = request.defaults({
  json: true,
  auth: {
    'username': geoserverConfig.username,
    'password': geoserverConfig.password
  },
  baseUrl: geoserverConfig.url + '/geoserver/rest'
});

exports.createLayer = function(event, callback) {
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

  geoserverRequest.delete({
    url: util.format('workspaces/%s/datastores/%s/featuretypes/%s?recurse=true', geoserverConfig.workspace, geoserverConfig.datastore, 'locations' + event._id),
  }, function(err, response) {
    if (err || response.statusCode !== 200) {
      log.error('Failed to delete geoserver location layer for event ' + event.name, err);
    } else {
      log.info('Deleted geoserver location layer for event ' + event.name);
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
        binding : "org.locationtech.jts.geom.Geometry"
      },
      userData : {
        encoding : "GeoJSON",
        mapping : "geometry"
      }
    },{
      localName : "event.name",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.event.name"
      }
    },{
      localName : "event.id",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.Integer"
      },
      userData : {
        mapping : "properties.event._id"
      }
    },{
      localName : "user.id",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user._id"
      }
    },{
      localName : "user.displayName",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user.displayName"
      }
    },{
      localName : "user.username",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user.username"
      }
    },{
      localName : "user.phone",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user.phone"
      }
    },{
      localName : "user.email",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.user.email"
      }
    },{
      localName : "provider",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.String"
      },
      userData : {
        mapping : "properties.provider"
      }
    },{
      localName : "accuracy",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.Integer"
      },
      userData : {
        mapping : "properties.accuracy"
      }
    },{
      localName : "speed",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.Integer"
      },
      userData : {
        mapping : "properties.speed"
      }
    },{
      localName : "bearing",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.Integer"
      },
      userData : {
        mapping : "properties.bearing"
      }
    },{
      localName : "altitude",
      minOccurs : 0,
      maxOccurs : 1,
      type : {
        binding : "java.lang.Double"
      },
      userData : {
        mapping : "properties.altitude"
      }
    },{
      localName : "timestamp",
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

  // Geoserver expects that the collection exists for the created,
  // his will ensure that the observation collection exists
  require('../models/location');

  async.series([
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
      cqlFilter: "\"event.id\" = " + event._id,
      attributes: {
        attribute: [{
          name: 'geometry',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'org.locationtech.jts.geom.Geometry'
        },{
          name: 'timestamp',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.util.Date'
        },{
          name: 'provider',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        },{
          name: 'accuracy',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.Integer'
        },{
          name: 'speed',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.Integer'
        },{
          name: 'bearing',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.Integer'
        },{
          name: 'altitude',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.Double'
        },{
          name: 'event.id',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.Integer'
        },{
          name: 'event.name',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        },{
          name: 'user.id',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        },{
          name: 'user.displayName',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        },{
          name: 'user.username',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        },{
          name: 'user.phone',
          minOccurs: 0,
          maxOccurs: 1,
          nillable: true,
          binding: 'java.lang.String'
        },{
          name: 'user.email',
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
