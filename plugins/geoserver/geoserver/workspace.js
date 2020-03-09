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
  getWorkspace(geoserverConfig.workspace, function(err, workspace) {
    if (err) return callback(err);

    if (workspace) {
      log.info('Geoserver workspace "%s:" already exists', workspace.name);
      return callback(err, workspace);
    }

    createWorkspace(geoserverConfig.workspace, callback);
  });
};

function getWorkspace(workspace, callback) {
  geoserverRequest.get({
    url: util.format('workspaces/%s?quietOnNotFound=true', workspace)
  }, function(err, response, body) {
    var workspace = body ? body.workspace : null;
    callback(err, workspace);
  });
}

function createWorkspace(workspace, callback) {
  log.info('Creating geoserver workspace %s', workspace);

  geoserverRequest.post({
    url: util.format('workspaces'),
    body: {
      workspace: {
        name: workspace,
      }
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    if (response.statusCode !== 201) {
      return callback(new Error('Failed to create geoserver workspace ' + workspace));
    }

    log.info('Created geoserver workspace ' + workspace);

    callback(err, body);
  });
}
