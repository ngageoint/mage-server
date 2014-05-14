var IconModel = require('../models/icon')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json');

var iconBase = config.server.iconBaseDirectory;

function Icon(form, type, variant) {
  this._form = form;
  this._type = type;
  this._variant = variant;
};

Icon.prototype.createIconPath = function(icon, name) {
  var ext = path.extname(name);
  var iconPath = this._form._id.toString();
  if (icon._type) {
    iconPath = path.join(iconPath, icon._type);
    if (this._variant) {
      iconPath = path.join(iconPath, this._variant + ext);
    } else {
      iconPath = path.join(iconPath, "default" + ext);
    }
  } else {
    iconPath = path.join(iconPath, "default" + ext);
  }

  return iconPath;
}

Icon.prototype.getIcon = function(callback) {
  var options = {
    formId: this._form._id,
    type: this._type,
    variant: this._variant
  };

  IconModel.getIcon(options, function(err, icon) {
    if (err || !icon) return callback(err);
    

    callback(null, path.join(iconBase, icon.relativePath));
  });
}

Icon.prototype.create = function(icon, callback) {
  var relativePath = this.createIconPath(this, icon.name);
  var newIcon = {
    formId: this._form._id,
    type: this._type || null,
    variant: this._variant || null,
    relativePath: relativePath
  }

  var iconPath = path.join(iconBase, relativePath);
  fs.mkdirp(path.dirname(iconPath), function(err) {
    fs.rename(icon.path, iconPath, function(err) {
      if (err) return callback(err);
      IconModel.create(newIcon, callback);
    });
  });
}

Icon.prototype.delete = function(callback) {
  var icon = {
    formId: this._form._id,
    type: this._type || null,
    variant: this._variant || null
  }

  IconModel.remove(icon, function(err, removedIcon) {
    if (err) return callback(err);

    var file = path.join(iconBase, removedIcon.relativePath);
    fs.remove(file, function(err) {
      if (err) {
        console.error("Could not remove attachment file " + file + ". ", err);
      }
    });

    callback(err, icon);
  });
}

module.exports = Icon;
