var request = require('request')
  , util = require('util')
  , log = require('winston')
  , geoserverConfig = require('../config').geoserver;

var geoserverRequest = request.defaults({
  json: true,
  auth: {
    'username': geoserverConfig.username,
    'password': geoserverConfig.password
  },
  baseUrl: geoserverConfig.url + '/geoserver/rest'
});

exports.create = function(callback) {
  getDatastore(geoserverConfig.datastore, function(err, datastore) {
    if (err) return callback(err);

    if (datastore) {
      log.info('Geoserver datastore "%s:" already exists', datastore.name);
      return callback(err, datastore);
    }

    createDatastore(geoserverConfig.workspace, callback);
  });
};

function getDatastore(datastore, callback) {
  geoserverRequest.get({
    url: util.format('workspaces/%s/datastores/%s?quietOnNotFound=true', geoserverConfig.workspace, datastore)
  }, function(err, response, body) {
    callback(err, body ? body.dataStore : null);
  });
}

function createDatastore(name, callback) {
  log.info('Creating geoserver datastore %s', name);

  var datastore = {
    name: name,
    description: "Mage Data Store",
    type: "MongoDB",
    connectionParameters: {
      entry: [{
        "@key": "data_store",
        "$": "mongodb://localhost/geoserverdb"
      },{
        "@key": "schema_store",
        "$": "mongodb://localhost/geoserverdb"
      }]
    }
  };

  geoserverRequest.post({
    url: util.format('workspaces/%s/datastores', geoserverConfig.workspace),
    body: {
      dataStore: datastore
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    if (response.statusCode !== 201) {
      return callback(new Error('Failed to create geoserver datastore'));
    }

    log.info('Created geoserver datastore ' + datastore);

    callback(err, body ? body.datastore : null);
  });
}
