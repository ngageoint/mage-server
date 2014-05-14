var IconModel = require('../models/icon')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json');

var iconBase = config.server.iconBaseDirectory;

function createIconPath(icon, name) {
  console.log('stuff', icon);
  var ext = path.extname(name);
  var iconPath = path.join(iconBase, icon._form._id.toString());
  if (icon._type) {
    iconPath = path.join(iconPath, icon._type);
    if (icon._variant) {
      iconPath = path.join(iconPath, icon._variant + ext);
    } else {
      iconPath = path.join(iconPath, "default" + ext);
    }
  } else {
    iconPath = path.join(iconPath, "default" + ext);
  }

  return iconPath;
}

function Icon(form, type, variant) {
  this._form = form;
  this._type = type;
  this._variant = variant;
};

Icon.prototype.getIcon = function(callback) {
  if (this._type) {

  } else {
    
  }
}

Icon.prototype.create = function(icon, callback) {
  var iconPath = createIconPath(this, icon.name);

  fs.mkdirp(path.dirname(iconPath), function(err) {
    console.log('trying to reaname from', icon.path);
    console.log('trying to reaname to', iconPath);
    fs.rename(icon.path, iconPath, function(err) {
      if (err) return callback(err);

      callback();
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
