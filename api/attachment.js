var FeatureModel = require('../models/feature')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json')
  , geometryFormat = require('../format/geoJsonFormat');

var attachmentBase = config.server.attachmentBaseDirectory;

var createAttachmentPath = function(layer) {
  var now = new Date();
  return path.join(
    layer.collectionName, 
    now.getFullYear().toString(), 
    (now.getMonth() + 1).toString(), 
    now.getDate().toString()
  );
}

function Attachment(layer, feature) {
  this._layer = layer;
  this._feature = feature;
};

Attachment.prototype.getById = function(id, callback) {
  if (id !== Object(id)) {
    id = {id: id, field: '_id'};
  }

  var attachment = null;
  this._feature.attachments.forEach(function(a) {
    if (a[id.field] == id.id) {
      attachment = a;
      return false; // found it, stop iterating
    }
  });

  if (!attachment) return callback(new Error('attachment not found'), null);

  var file = path.join(attachmentBase, attachment.relativePath);
  fs.readFile(file, function(err, data) {
    if (err) return callback(err);

    return callback(null, {attachment: attachment, data: data});
  });
}

Attachment.prototype.create = function(id, attachment, callback) {
  var layer = this._layer;
  var feature = this._feature;

  var relativePath = createAttachmentPath(layer)
  // move file upload to its new home
  var dir = path.join(attachmentBase, relativePath);
  fs.mkdirp(dir, function(err) {
    if (err) return callback(err);

    var fileName = path.basename(attachment.path);
    attachment.relativePath = path.join(relativePath, fileName);
    var file = path.join(attachmentBase, attachment.relativePath);
    fs.rename(attachment.path, file, function(err) {
      if (err) return next(err);

      FeatureModel.addAttachment(layer, id, attachment, function(err, newAttachment) {
        if (err) return callback(err);

        callback(null, newAttachment);
      });  
    });
  });
}

Attachment.prototype.update = function(id, attachment, callback) {
  var layer = this._layer;
  var feature = this._feature;

  var relativePath = createAttachmentPath(layer, attachment);
  var dir = path.join(attachmentBase, relativePath);
  // move file upload to its new home
  fs.mkdirp(dir, function(err) {
    if (err) return callback(err);

    var fileName = path.basename(attachment.path);
    attachment.relativePath = path.join(relativePath, fileName);
    var file = path.join(attachmentBase, attachment.relativePath);
    fs.rename(attachment.path, file, function(err) {
      if (err) return callback(err);

      Feature.updateAttachment(layer, id, attachment, function(err) {
        if (err) return callback(err);

        callback(null, attachment);
      });  
    });
  });
}

Attachment.prototype.delete = function(id, callback) {
  var layer = this._layer;
  var feature = this._feature;
    if (id !== Object(id)) {
    id = {id: id, field: '_id'};
  }

  FeatureModel.removeAttachment(feature, id, function(err) {
    if (err) return callback(err);

    var attachment = null;
    feature.attachments.forEach(function(a) {
      if (a[id.field] == id.id) {
        attachment = a;
        return false; //found attachment stop iterating
      }
    });

    if (attachment) {
      var file = path.join(attachmentBase, attachment.relativePath);
      fs.remove(file, function(err) {
        if (err) {
          console.error("Could not remove attachment file " + file + ". ", err);
        }
      });
    }

    callback(null);
  });
}

module.exports = Attachment;