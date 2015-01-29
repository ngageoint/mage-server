var ObservationModel = require('../models/observation')
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

var createAttachmentPath = function(event) {
  var now = new Date();
  return path.join(
    event.collectionName,
    now.getFullYear().toString(),
    (now.getMonth() + 1).toString(),
    now.getDate().toString()
  );
}

function Attachment(event, observation) {
  this._event = event;
  this._observation = observation;
};

Attachment.prototype.getById = function(attachmentId, options, callback) {
  var size = options.size ? Number(options.size) : null;

  ObservationModel.getAttachment(this._event, this._observation._id, attachmentId, function(attachment) {
    if (!attachment) return callback();

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

Attachment.prototype.create = function(observationId, attachment, callback) {
  var event = this._event;
  var observation = this._observation;

  var relativePath = createAttachmentPath(event);
  // move file upload to its new home
  var dir = path.join(attachmentBase, relativePath);
  fs.mkdirp(dir, function(err) {
    if (err) return callback(err);

    var fileName = path.basename(attachment.path);
    attachment.relativePath = path.join(relativePath, fileName);
    var file = path.join(attachmentBase, attachment.relativePath);

    fs.rename(attachment.path, file, function(err) {
      if (err) return callback(err);

      ObservationModel.addAttachment(event, observationId, attachment, function(err, newAttachment) {
        callback(err, newAttachment);
      });
    });
  });
}

Attachment.prototype.update = function(id, attachment, callback) {
  var event = this._event;
  var observation = this._observation;

  var relativePath = createAttachmentPath(event, attachment);
  var dir = path.join(attachmentBase, relativePath);
  // move file upload to its new home
  fs.mkdirp(dir, function(err) {
    if (err) return callback(err);

    var fileName = path.basename(attachment.path);
    attachment.relativePath = path.join(relativePath, fileName);
    var file = path.join(attachmentBase, attachment.relativePath);
    fs.rename(attachment.path, file, function(err) {
      if (err) return callback(err);

      ObservationModel.updateAttachment(event, id, attachment, function(err) {
        if (err) return callback(err);

        callback(err, attachment);
      });
    });
  });
}

Attachment.prototype.delete = function(id, callback) {
  var event = this._event;
  var observation = this._observation;
    if (id !== Object(id)) {
    id = {id: id, field: '_id'};
  }

  ObservationModel.removeAttachment(observation, id, function(err) {
    if (err) return callback(err);

    var attachment = null;
    observation.attachments.forEach(function(a) {
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

    callback();
  });
}

module.exports = Attachment;
