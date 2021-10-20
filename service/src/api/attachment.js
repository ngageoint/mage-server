const ObservationModel = require('../models/observation')
  , AttachmentEvents = require('./events/attachment.js')
  , log = require('winston')
  , path = require('path')
  , fs = require('fs-extra')
  , environment = require('../environment/env');

const attachmentBase = environment.attachmentBaseDirectory;

const createAttachmentPath = function(event) {
  const now = new Date();
  return path.join(
    event.collectionName,
    now.getFullYear().toString(),
    (now.getMonth() + 1).toString(),
    now.getDate().toString()
  );
};

function Attachment(event, observation) {
  this._event = event;
  this._observation = observation;
}

const EventEmitter = new AttachmentEvents();
Attachment.on = EventEmitter;

Attachment.prototype.getById = function(attachmentId, options, callback) {
  const size = options.size ? Number(options.size) : null;

  ObservationModel.getAttachment(this._event, this._observation._id, attachmentId, function(err, attachment) {
    if (!attachment) return callback(err);

    if (size) {
      attachment.thumbnails.forEach(function(thumbnail) {
        if ((thumbnail.minDimension < attachment.height || !attachment.height) &&
          (thumbnail.minDimension < attachment.width || !attachment.width) &&
          (thumbnail.minDimension >= size)) {
          attachment = thumbnail;
        }
      });
    }

    if (attachment && attachment.relativePath) attachment.path = path.join(attachmentBase, attachment.relativePath);

    callback(null, attachment);
  });
};

Attachment.prototype.update = function(attachmentId, attachment, callback) {
  const relativePath = createAttachmentPath(this._event);
  // move file upload to its new home
  const dir = path.join(attachmentBase, relativePath);
  fs.mkdirp(dir, err => {
    if (err) return callback(err);

    const fileName = path.basename(attachment.path);
    attachment.relativePath = path.join(relativePath, fileName);
    const file = path.join(attachmentBase, attachment.relativePath);

    fs.move(attachment.path, file, err => {
      if (err) return callback(err);

      ObservationModel.addAttachment(this._event, this._observation._id, attachmentId, attachment, (err, newAttachment) => {
        if (!err && newAttachment) {
          EventEmitter.emit(AttachmentEvents.events.add, newAttachment.toObject(), this._observation, this._event);
        }

        callback(err, newAttachment);
      });
    });
  });
};

Attachment.prototype.delete = function(attachmentId, callback) {
  const attachment = this._observation.attachments.find(attachment => attachment._id.toString() === attachmentId);
  ObservationModel.removeAttachment(this._event, this._observation._id, attachmentId, err => {
    if (err) return callback(err);

    if (attachment && attachment.relativePath) {
      const file = path.join(attachmentBase, attachment.relativePath);
      fs.remove(file, err => {
        if (err) {
          log.error('Could not remove attachment file ' + file + '.', err);
        }
      });
    }

    callback();
  });
};

Attachment.prototype.deleteAllForEvent = function (callback) {
  const directoryPath = path.join(attachmentBase, this._event.collectionName);
  log.info('removing attachments directory ' + directoryPath);

  fs.remove(directoryPath, function(err) {
    if (err) {
      log.warn('Could not remove attachments for event at path "' + directoryPath + '"', err);
    }

    callback(err);
  });
};

module.exports = Attachment;
