var IconModel = require('../models/icon')
  , mongoose = require('mongoose')
  , log = require('winston')
  , path = require('path')
  , fs = require('fs-extra')
  , os = require('os')
  , archiver = require('archiver')
  , environment = require('environment');

var appRoot = path.dirname(require.main.filename);
var iconBase = environment.iconBaseDirectory;

function Icon(eventId, formId, type, variant) {
  this._eventId = eventId || null;
  this._formId = formId || null;
  this._type = type || null;
  this._variant = variant || null;

  if (this._variant) {
    var number = Number(this._variant);
    if (!Number.isNaN(number)) {
      this._variant = number;
    }
  }
}

function createIconPath(icon, name) {
  var ext = path.extname(name);
  var iconPath = path.join(icon._eventId.toString(), icon._formId.toString());
  if (icon._type !== null) {
    iconPath = path.join(iconPath, icon._type);
    if (icon._variant !== null) {
      iconPath = path.join(iconPath, icon._variant);
    }
  }

  iconPath = path.join(iconPath, "icon" + ext);

  return iconPath;
}

Icon.prototype.getBasePath = function() {
  return path.join(iconBase, this._eventId.toString());
};

Icon.prototype.writeZip = function(zipPath, callback) {
  var output = fs.createWriteStream(zipPath);
  var archive = archiver('zip');
  output.on('close', callback);
  archive.on('warning', callback);
  archive.on('error', callback);
  archive.pipe(output);
  archive.directory(path.join(this.getBasePath()), 'icons');
  archive.finalize();
};

Icon.prototype.getZipPath = function(callback) {
  var zipPath = path.join(os.tmpdir(), this._eventId+'_icons'+mongoose.Types.ObjectId()+'.zip');
  this.writeZip(zipPath, function(err) {
    return callback(err, zipPath);
  }.bind(this));
};

Icon.prototype.getIcon = function(callback) {
  var options = {
    eventId: this._eventId,
    formId: this._formId,
    type: this._type,
    variant: this._variant
  };

  IconModel.getIcon(options, function(err, icon) {
    if (err || !icon) return callback(err);
    callback(null, path.join(iconBase, icon.relativePath));
  });
};

Icon.prototype.setDefaultIcon = function(callback) {
  var relativePath = createIconPath(this, 'default-icon.png');
  var newIcon = {
    eventId: this._eventId,
    formId: this._formId,
    relativePath: relativePath
  };

  var iconPath = path.join(iconBase, relativePath);
  fs.copy(path.join(appRoot, '/public/img/default-icon.png'), iconPath, function(err) {
    if (err) return callback(err);

    IconModel.create(newIcon, callback);
  });
};

Icon.prototype.getDefaultIcon = function(callback) {
  return callback(null, path.join(appRoot, '/public/img/default-icon.png'));
};

Icon.prototype.create = function(icon, callback) {
  var relativePath = createIconPath(this, icon.name);
  var newIcon = {
    eventId: this._eventId,
    formId: this._formId,
    type: this._type,
    variant: this._variant,
    relativePath: relativePath
  };

  var iconPath = path.join(iconBase, relativePath);
  fs.mkdirp(path.dirname(iconPath), function(err) {
    if (err) return callback(err);

    fs.rename(icon.path, iconPath, function(err) {
      if (err) return callback(err);

      IconModel.create(newIcon, function(err, oldIcon) {
        callback(err, newIcon);

        if (oldIcon && oldIcon.relativePath !== newIcon.relativePath) {
          fs.remove(path.join(iconBase, oldIcon.relativePath), function(err) {
            if (err) log.error('could not remove old icon from file system', err);
          });
        }
      });
    });
  });
};

Icon.prototype.add = function(icon, callback) {
  var relativePath = createIconPath(this, icon.name);
  var newIcon = {
    eventId: this._eventId,
    formId: this._formId,
    type: this._type,
    variant: this._variant,
    relativePath: relativePath
  };

  IconModel.create(newIcon, function(err) {
    callback(err, newIcon);
  });
};

Icon.prototype.delete = function(callback) {
  var self = this;
  var conditions = {
    eventId: this._eventId,
    formId: this._formId,
    type: this._type,
    variant: this._variant
  };

  IconModel.getIcon(conditions, function(err) {
    if (err) return callback(err);

    var remove = {eventId: self._eventId, formId: self._formId};
    if (self._type) remove.type = self._type;
    if (self._variant) remove.variant = self._variant;

    IconModel.remove(remove, function(err) {
      if (err) return callback(err);

      callback(err);

      // remove the variant dir, type dir, or base dir
      var removePath = path.join(iconBase, self._eventId.toString());
      if (self._type) {
        removePath = path.join(removePath, self._type);
        if (self._variant) {
          removePath = path.join(removePath, self._variant);
        }
      }

      log.info('removing icons: ', removePath);
      fs.remove(removePath, function(err) {
        if (err) {
          log.error("Could not remove attachment file " + removePath + ". ", err);
        }
      });
    });
  });
};

module.exports = Icon;
