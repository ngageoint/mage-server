var FormModel = require('../models/form')
  , api = require('../api')
  , Zip = require('adm-zip')
  , archiver = require('archiver')
  , walk = require('walk')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json');

var iconBase = config.server.iconBaseDirectory;

function Form(form) {
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

Form.prototype.getAll = function(callback) {
  FormModel.getAll(function (err, forms) {
    callback(err, forms);
  });
}

Form.prototype.getById = function(id, callback) {
  FormModel.getById(id, function(err, form) {
    callback(err, form);
  });
}

Form.prototype.export = function(form, callback) {
  var iconBasePath = new api.Icon(form).getBasePath();
  var archive = archiver('zip');
  archive.bulk([{src: ['**'], dest: 'form/icons', expand: true, cwd: iconBasePath}]);
  archive.append(JSON.stringify(form), {name: "form/form.json"});
  archive.finalize();

  callback(null, archive);
}

Form.prototype.import = function(file, callback) {

  if (file.mimetype != 'application/zip') return callback(new Error('File attachment must be of type "zip"'));

  var zip = new Zip(file.path);
  var form = zip.readAsText('form/form.json');
  if (!form) return callback(new Error('invalid zip archive, no form.json'));
  try {
    form = JSON.parse(form);
  } catch (e) {
    return callback(new Error('invalid zip archive cannot parse'));
  }

  this.create(form, function(err, newForm) {
    if (err) return callback(err);

    var iconsEntry = zip.getEntry('form/icons/');
    if (iconsEntry) {
      var iconPath = new api.Icon(newForm).getBasePath() + path.sep;
      console.log('extracting icons for imported zip to ', iconPath);

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

        new api.Icon(newForm, type, variant).add({name: stat.name}, function(err, addedIcon) {
          next(err);
        });
      });
      walker.on("end", function() {
        callback(null, newForm);
      });
    }
  });
}

Form.prototype.create = function(form, callback) {
  FormModel.create(form, function(err, newForm) {
    callback(err, newForm);
  });
}

Form.prototype.update = function(id, form, callback) {
  FormModel.update(id, form, function(err, updatedForm) {
    callback(err, updatedForm);
  });
}

Form.prototype.delete = function(id, callback) {
  FormModel.remove(id, function(err) {
    if (err) return callback(err);

    var iconPath = new api.Icon({_id: id}).getBasePath();
    fs.remove(iconPath, function(err) {
      if (err) console.log('could not remove icon dir for deleted form id: ' + id)
    });

    callback();
  });
}

module.exports = Form;
