const log = require('winston')
const path = require('path')
const fs = require('fs-extra')
const environment = require('../environment/env')

const attachmentBase = environment.attachmentBaseDirectory

function Attachment(event, observation) {
  this._event = event;
  this._observation = observation;
}

/**
 * TODO: this no longer works with the directory scheme `FileSystemAttachmentStore` uses.
 */
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
