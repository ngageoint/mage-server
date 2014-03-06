var IconModel = require('../models/icon')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json');

var iconBase = config.server.iconBaseDirectory;

function Icon() {
};

Icon.prototype.getAll = function(callback) {
  IconModel.getAll(function(err, icons) {
    if (err) console.log("Error getting icons");

    return callback(err, icons);
  });
}

Icon.prototype.getById = function(id, callback) {
  var icon = null;

  IconModel.getById(id, function(err, icon) {
    if (err) console.log("Error getting icon with id: '" + id + "'.", err);

    if (icon) icon.path = path.join(icon, icon.relativePath);

    return callback(err, icon);
  });
}

Icon.prototype.create = function(icon, callback) {
  var fileName = path.basename(icon.path);
  icon.relativePath = fileName;
  var file = path.join(iconBase, icon.relativePath);
  console.log('trying to reaname from', icon.path);
  console.log('trying to reaname to', file);
  fs.rename(icon.path, file, function(err) {
    if (err) return next(err);

    IconModel.create(icon, function(err, newIcon) {
      if (err) return callback(err);

      callback(null, newIcon);
    });  
  });
}

Icon.prototype.delete = function(icon, callback) {
  IconModel.remove(icon._id, function(err) {
    if (err) return callback(err);

    var file = path.join(iconBase, icon.relativePath);
    fs.remove(file, function(err) {
      if (err) {
        console.error("Could not remove attachment file " + file + ". ", err);
      }
    });

    callback(err, icon);
  });
}

module.exports = Icon;