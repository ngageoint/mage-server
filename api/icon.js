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

function createIconPath(icon, name) {
  var ext = path.extname(name);
  var iconPath = icon._form._id.toString();
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
  var relativePath = createIconPath(this, icon.name);
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
  var self = this;
  var conditions = {
    formId: this._form._id,
    type: this._type,
    variant: this._variant
  };

  IconModel.getIcon(conditions, function(err, icon) {
    if (err) return callback(err);

    var remove = {formId: self._form._id};
    if (self._type) remove.type = self._type;
    if (self._variant) remove.variant = self._variant;

    IconModel.remove(remove, function(err) {
      if (err) return callback(err);

      callback(err);

      //TODO need to remove the variant file, type dir, or default.png
      var removePath;
      if (self._type && self._variant) {
        removePath = path.join(iconBase, icon.relativePath);
      } else if (self._type) {
        removePath = [iconBase, self._form._id, self._type].join("/");
      } else {
        removePath = path.join(iconBase, self._form._id.toString());
      }

      console.log('removing icons: ', removePath);
      fs.remove(removePath, function(err) {
        if (err) {
          console.error("Could not remove attachment file " + file + ". ", err);
        }
      });
    });
  });
}

module.exports = Icon;
