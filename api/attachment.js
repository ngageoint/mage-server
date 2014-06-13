var FeatureModel = require('../models/feature')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json')
  , geometryFormat = require('../format/geoJsonFormat');

var attachmentConfig = config.server.attachment;
var attachmentBase = attachmentConfig.baseDirectory;

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

Attachment.prototype.getById = function(attachmentId, options, callback) {
  var size = options.size ? Number(options.size) : null;

  FeatureModel.getAttachment(this._layer, this._feature._id, attachmentId, function(attachment) {
    if (size) {
      attachment.thumbnails.forEach(function(thumbnail) {
        if ((thumbnail.minDimension < attachment.height || !attachment.height)
          && (thumbnail.minDimension < attachment.width || !attachment.width)
          && (thumbnail.minDimension >= size)) {
            attachment = thumbnail;
        }
      });
    }

    if (attachment) attachment.path = path.join(attachmentBase, attachment.relativePath);

    callback(null, attachment);
  });
}

Attachment.prototype.create = function(featureId, attachment, callback) {
  var layer = this._layer;
  var feature = this._feature;

  var relativePath = createAttachmentPath(layer);
  // move file upload to its new home
  var dir = path.join(attachmentBase, relativePath);
  fs.mkdirp(dir, function(err) {
    if (err) return callback(err);

    var fileName = path.basename(attachment.path);
    attachment.relativePath = path.join(relativePath, fileName);
    var file = path.join(attachmentBase, attachment.relativePath);

    fs.rename(attachment.path, file, function(err) {
      if (err) {
        callback(err);
        return;
      }

      FeatureModel.addAttachment(layer, featureId, attachment, function(err, newAttachment) {
        callback(err, newAttachment);
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
