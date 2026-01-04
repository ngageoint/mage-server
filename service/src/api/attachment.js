/**
 * API-layer Attachment service.
 *
 * RESPONSIBILITY:
 * - Orchestrates filesystem operations for attachments
 * - Coordinates with models/observation.js for MongoDB updates
 *
 * IMPORTANT ARCHITECTURE NOTES:
 * - This file DOES NOT own MongoDB schemas
 * - This file DOES NOT perform virus scanning
 * - Virus scanning MUST happen in models/observation.js
 *   immediately before attachment metadata is persisted
 */

const ObservationModel = require('../models/observation') // <-- Mongoose boundary
  , log = require('winston')
  , path = require('path')
  , fs = require('fs-extra')
  , environment = require('../environment/env');

const attachmentBase = environment.attachmentBaseDirectory;

/**
 * Generates a date-based relative path for attachment storage.
 *
 * Example:
 *   <eventCollection>/2026/1/4/
 *
 * NOTE:
 * - Physical file placement happens here
 * - DB reference is saved later by models/observation.js
 */
const createAttachmentPath = function(event) {
  const now = new Date();
  return path.join(
    event.collectionName,
    now.getFullYear().toString(),
    (now.getMonth() + 1).toString(),
    now.getDate().toString()
  );
};

/**
 * Attachment API wrapper.
 *
 * @param {Event} event
 * @param {Observation} observation (already loaded)
 */
function Attachment(event, observation) {
  this._event = event;
  this._observation = observation;
}

/**
 * Fetch an attachment or thumbnail.
 *
 * NOTE:
 * - Reads attachment metadata from Mongo via models/observation.js
 * - Resolves filesystem path AFTER DB lookup
 */
Attachment.prototype.getById = function(attachmentId, options, callback) {
  const size = options.size ? Number(options.size) : null;

  ObservationModel.getAttachment(
    this._event,
    this._observation._id,
    attachmentId,
    function(err, attachment) {
      if (!attachment) return callback(err);

      // Select best thumbnail based on requested size
      if (size) {
        attachment.thumbnails.forEach(function(thumbnail) {
          if (
            (thumbnail.minDimension < attachment.height || !attachment.height) &&
            (thumbnail.minDimension < attachment.width || !attachment.width) &&
            (thumbnail.minDimension >= size)
          ) {
            attachment = thumbnail;
          }
        });
      }

      // Resolve absolute file path for downstream consumers
      if (attachment && attachment.relativePath) {
        attachment.path = path.join(attachmentBase, attachment.relativePath);
      }

      callback(null, attachment);
    }
  );
};

/**
 * Finalize an uploaded attachment.
 *
 * FLOW:
 * 1. Move uploaded file to permanent storage location
 * 2. Call models/observation.js to persist metadata
 *
 * CRITICAL:
 * - File exists on disk BEFORE DB update
 * - Virus scan MUST occur inside ObservationModel.addAttachment()
 *   before MongoDB is updated
 */
Attachment.prototype.update = function(attachmentId, attachment, callback) {
  const relativePath = createAttachmentPath(this._event);

  // Ensure destination directory exists
  const dir = path.join(attachmentBase, relativePath);
  fs.mkdirp(dir, err => {
    if (err) return callback(err);

    const fileName = path.basename(attachment.path);
    attachment.relativePath = path.join(relativePath, fileName);
    const file = path.join(attachmentBase, attachment.relativePath);

    // Move temp upload to permanent location
    fs.move(attachment.path, file, err => {
      if (err) return callback(err);

      /**
       * Persist attachment metadata.
       *
       * NOTE:
       * - This calls models/observation.js
       * - Virus scan must happen there, not here
       */
      ObservationModel.addAttachment(
        this._event,
        this._observation._id,
        attachmentId,
        attachment,
        (err, newAttachment) => {
          callback(err, newAttachment);
        }
      );
    });
  });
};

/**
 * Delete an attachment.
 *
 * FLOW:
 * 1. Remove attachment reference from MongoDB
 * 2. Best-effort delete file from filesystem
 */
Attachment.prototype.delete = function(attachmentId, callback) {
  const attachment = this._observation.attachments.find(
    attachment => attachment._id.toString() === attachmentId
  );

  ObservationModel.removeAttachment(
    this._event,
    this._observation._id,
    attachmentId,
    err => {
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
    }
  );
};

/**
 * Remove all attachments for an event.
 *
 * NOTE:
 * - Dangerous operation
 * - Primarily for teardown / admin workflows
 */
Attachment.prototype.deleteAllForEvent = function (callback) {
  const directoryPath = path.join(
    attachmentBase,
    this._event.collectionName
  );

  log.info('removing attachments directory ' + directoryPath);

  fs.remove(directoryPath, function(err) {
    if (err) {
      log.warn(
        'Could not remove attachments for event at path "' + directoryPath + '"',
        err
      );
    }

    callback(err);
  });
};

module.exports = Attachment;


/**
 * SUMMARY
 * 🔑 Final clarity (no ambiguity left)
Layer	File	Responsibility
routes	routes/observations.js	HTTP, auth, validation
api	api/observation.js	orchestration, events
api	api/attachment.js	filesystem ops
models	models/observation.js	MongoDB writes + VIRUS SCAN
 */
