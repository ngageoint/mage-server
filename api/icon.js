var IconModel = require('../models/icon')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json');

var iconBase = config.server.iconBaseDirectory;
var rootDir = path.dirname(require.main.filename);

function Icon(formId, type, variant) {
  this._formId = formId || null;
  this._type = type || null;
  this._variant = variant || null;

  if (this._variant) {
    var number = Number(this._variant);
    if (!Number.isNaN(number)) {
      this._variant = number;
    }
  }
};

function createIconPath(icon, name) {
  var ext = path.extname(name);
  console.log('formId:', icon._formId);
  console.log('formId:', this._formId);
  var iconPath = icon._formId.toString();
  if (icon._type != null) {
    iconPath = path.join(iconPath, icon._type);
    if (icon._variant != null) {
      iconPath = path.join(iconPath, icon._variant);
    }
  }

  iconPath = path.join(iconPath, "icon" + ext);

  return iconPath;
}

Icon.prototype.getBasePath = function() {
  return path.join(iconBase, this._formId.toString());
}

Icon.prototype.getIcon = function(callback) {
  var options = {
    formId: this._formId,
    type: this._type,
    variant: this._variant
  };

  IconModel.getIcon(options, function(err, icon) {
    if (err || !icon) return callback(err);

    callback(null, path.join(iconBase, icon.relativePath));
  });
}

Icon.prototype.getDefaultIcon = function(callback) {
  return callback(null, path.join(rootDir,'/public/img/default-icon.png'));
}

Icon.prototype.create = function(icon, callback) {
  var relativePath = createIconPath(this, icon.name);
  var newIcon = {
    formId: this._formId,
    type: this._type,
    variant: this._variant,
    relativePath: relativePath
  }

  var iconPath = path.join(iconBase, relativePath);
  fs.mkdirp(path.dirname(iconPath), function(err) {
    fs.rename(icon.path, iconPath, function(err) {
      if (err) { console.log(err); return callback(err); }

      IconModel.create(newIcon, function(err, oldIcon) {
        callback(err, newIcon);

        if (oldIcon && oldIcon.relativePath != newIcon.relativePath) {
          fs.remove(path.join(iconBase, oldIcon.relativePath), function(err) {
            if (err) console.log('could not remove old icon from file system', err);
          });
        }
      });
    });
  });
}

Icon.prototype.add = function(icon, callback) {
  var relativePath = createIconPath(this, icon.name);
  var newIcon = {
    formId: this._formId,
    type: this._type,
    variant: this._variant,
    relativePath: relativePath
  }

  IconModel.create(newIcon, function(err, oldIcon) {
    callback(err, newIcon);
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

    var remove = {formId: self._formId};
    if (self._type) remove.type = self._type;
    if (self._variant) remove.variant = self._variant;

    IconModel.remove(remove, function(err) {
      if (err) return callback(err);

      callback(err);

      // remove the variant dir, type dir, or base dir
      var removePath = path.join(iconBase, self._formId);
      if (self._type) {
        removePath = path.join(removePath, self._type);
        if (self._variant) {
          removePath = path.join(removePath, self._variant);
        }
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
