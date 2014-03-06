var Icon = require('../models/icon')
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
  Icon.getAll(function(err, icons) {
    if (err) console.log("Error getting icons");

    return callback(err, icons);
  });
}

Icon.prototype.getById = function(id, callback) {
  var icon = null;

  Icon.getById(id, function(err, icon) {
    if (err) console.log("Error getting icon with id: '" + id + "'.", err);

    if (icon) icon.path = path.join(icon, icon.relativePath);

    return callback(err, icon);
  });
}

Icon.prototype.create = function(id, icon, callback) {
  // move file upload to its new home
  if (err) return callback(err);

  var fileName = path.basename(icon.path);
  icon.relativePath = fileName;
  var file = path.join(iconBase, icon.relativePath);
  fs.rename(icon.path, file, function(err) {
    if (err) return next(err);

    Icon.create(icon, function(err, newIcon) {
      if (err) return callback(err);

      callback(null, newIcon);
    });  
  });
}

// Icon.prototype.update = function(id, attachment, callback) {
//   var layer = this._layer;
//   var feature = this._feature;

//   var relativePath = createAttachmentPath(layer, attachment);
//   var dir = path.join(attachmentBase, relativePath);
//   // move file upload to its new home
//   fs.mkdirp(dir, function(err) {
//     if (err) return callback(err);

//     var fileName = path.basename(attachment.path);
//     attachment.relativePath = path.join(relativePath, fileName);
//     var file = path.join(attachmentBase, attachment.relativePath);
//     fs.rename(attachment.path, file, function(err) {
//       if (err) return callback(err);

//       Feature.updateAttachment(layer, id, attachment, function(err) {
//         if (err) return callback(err);

//         callback(null, attachment);
//       });  
//     });
//   });
// }

// Icon.prototype.delete = function(id, callback) {
//   var layer = this._layer;
//   var feature = this._feature;
//     if (id !== Object(id)) {
//     id = {id: id, field: '_id'};
//   }

//   FeatureModel.removeAttachment(feature, id, function(err) {
//     if (err) return callback(err);

//     var attachment = null;
//     feature.attachments.forEach(function(a) {
//       if (a[id.field] == id.id) {
//         attachment = a;
//         return false; //found attachment stop iterating
//       }
//     });

//     if (attachment) {
//       var file = path.join(attachmentBase, attachment.relativePath);
//       fs.remove(file, function(err) {
//         if (err) {
//           console.error("Could not remove attachment file " + file + ". ", err);
//         }
//       });
//     }

//     callback(null);
//   });
// }

module.exports = Icon;