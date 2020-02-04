const IconModel = require('../models/icon')
  , mongoose = require('mongoose')
  , log = require('winston')
  , path = require('path')
  , fs = require('fs-extra')
  , os = require('os')
  , archiver = require('archiver')
  , environment = require('../environment/env');

const appRoot = path.resolve(__dirname, '..');
const iconBase = environment.iconBaseDirectory;
const defaultIconPath = path.join(appRoot, 'assets/default-icon.png');

function Icon(eventId, formId, primary, variant) {
  this._eventId = eventId || null;
  this._formId = formId === "null" || !formId ? null : formId;
  this._primary = primary === "null" || !primary ? null : primary;
  this._variant = variant === "null" || !variant ? null : variant;

  if (this._variant) {
    var number = Number(this._variant);
    if (!Number.isNaN(number)) {
      this._variant = number;
    }
  }
}

function createIconPath(icon, name) {
  var ext = path.extname(name);
  var iconPath = icon._eventId.toString();
  if (icon._formId !== null) {
    iconPath = path.join(iconPath, icon._formId.toString());
    if (icon._primary !== null) {
      iconPath = path.join(iconPath, icon._primary);
      if (icon._variant !== null) {
        iconPath = path.join(iconPath, icon._variant);
      }
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
  var zipPath = path.join(os.tmpdir(), this._eventId + '_icons' + mongoose.Types.ObjectId() + '.zip');
  this.writeZip(zipPath, function(err) {
    return callback(err, zipPath);
  }.bind(this));
};

Icon.prototype.getIcons = function(callback) {
  var options = {
    eventId: this._eventId,
    formId: this._formId
  };

  IconModel.getAll(options, function(err, icons) {
    if (err) return callback(err);

    icons.forEach(function(icon) {
      icon.path = path.join(iconBase, icon.relativePath);
    });

    callback(null, icons);
  });
};

Icon.prototype.getIcon = function(callback) {
  var options = {
    eventId: this._eventId,
    formId: this._formId,
    primary: this._primary,
    variant: this._variant
  };

  IconModel.getIcon(options, function(err, icon) {
    if (err || !icon) {
      return callback(err);
    }

    icon.path = path.join(iconBase, icon.relativePath);
    callback(err, icon);
  });
};

Icon.prototype.saveDefaultIconToEventForm = function(callback) {
  const relativePath = createIconPath(this, 'default-icon.png');
  const targetPath = path.join(iconBase, relativePath);
  const newIcon = {
    eventId: this._eventId,
    formId: this._formId,
    relativePath: relativePath
  };
  fs.copy(defaultIconPath, targetPath, function(err) {
    if (err) {
      return callback(err);
    }
    IconModel.create(newIcon, callback);
  });
};

Icon.prototype.create = function(icon, callback) {
  var relativePath = createIconPath(this, icon.originalname);
  var newIcon = {
    eventId: this._eventId,
    formId: this._formId,
    primary: this._primary,
    variant: this._variant,
    relativePath: relativePath
  };

  var iconPath = path.join(iconBase, relativePath);
  fs.mkdirp(path.dirname(iconPath), function(err) {
    if (err) return callback(err);

    fs.move(icon.path, iconPath, {overwrite: true}, function(err) {
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
    primary: this._primary,
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
    primary: this._primary,
    variant: this._variant
  };

  IconModel.getIcon(conditions, function(err) {
    if (err) return callback(err);

    var remove = {eventId: self._eventId, formId: self._formId};
    if (self._primary) remove.primary = self._primary;
    if (self._variant) remove.variant = self._variant;

    IconModel.remove(remove, function(err) {
      if (err) return callback(err);

      callback(err);

      // remove the variant dir, primary dir, or base dir
      var removePath = path.join(iconBase, self._eventId.toString());
      if (self._primary) {
        removePath = path.join(removePath, self._primary);
        if (self._variant) {
          removePath = path.join(removePath, self._variant);
        }
      }

      log.info('removing icons: ', removePath);
      fs.remove(removePath, function(err) {
        if (err) {
          log.error("Could not remove icon file " + removePath + ". ", err);
        }
      });
    });
  });
};

Object.defineProperty(Icon, 'defaultIconPath', {
  value: defaultIconPath
});

module.exports = Icon;
