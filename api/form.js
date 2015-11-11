var Event = require('../models/event')
  , api = require('../api')
  , Zip = require('adm-zip')
  , archiver = require('archiver')
  , walk = require('walk')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , os = require('os')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.js');

var iconBase = config.server.iconBaseDirectory;

function Form(event) {
  this._event = event;
};

function createIconPath(icon, name) {
  var ext = path.extname(name);
  var iconPath = icon._form._id.toString();
  if (icon._type != null) {
    iconPath = path.join(iconPath, icon._type);
    if (icon._variant != null) {
      iconPath = path.join(iconPath, icon._variant + ext);
    } else {
      iconPath = path.join(iconPath, "default" + ext);
    }
  } else {
    iconPath = path.join(iconPath, "default" + ext);
  }

  return iconPath;
}

Form.prototype.export = function(callback) {
  var iconBasePath = new api.Icon(this._event._id).getBasePath();
  var archive = archiver('zip');
  archive.bulk([{src: ['**'], dest: 'form/icons', expand: true, cwd: iconBasePath}]);
  archive.append(JSON.stringify(this._event.form), {name: "form/form.json"});
  archive.finalize();

  callback(null, archive);
}

Form.prototype.import = function(file, callback) {
  if (file.extension != 'zip') return callback(new Error('File attachment must be of type "zip"'));

  var event = this._event;
  var zip = new Zip(file.path);
  var form = zip.readAsText('form/form.json');
  if (!form) return callback(new Error('invalid zip archive, no form.json'));
  try {
    form = JSON.parse(form);
  } catch (e) {
    return callback(new Error('invalid zip archive cannot parse'));
  }

  var iconsEntry = zip.getEntry('form/icons/');
  if (iconsEntry) {
    var iconPath = new api.Icon(event._id).getBasePath() + path.sep;

    zip.extractEntryTo(iconsEntry, iconPath, false, false);

    // for each file in each directory
    var walker = walk.walk(iconPath);
    walker.on("file", function(filePath, stat, next) {
      var type = null;
      var variant = null;
      var regex = new RegExp(iconPath + path.sep + "+(.*)");
      var match = regex.exec(filePath);
      if (match && match[1]) {
        var variants = match[1].split("/");
        type = variants.shift();
        variant = variants.shift();
      }

      new api.Icon(event._id, type, variant).add({name: stat.name}, function(err, addedIcon) {
        next(err);
      });
    });
    walker.on("end", function() {
      callback(null, form);
    });
  }
}

module.exports = Form;
