var FeatureModel = require('../models/feature')
  , path = require('path')
  , util = require('util')
  , fs = require('fs-extra')
  , async = require('async')
  , moment = require('moment')
  , access = require('../access')
  , config = require('../config.json')
  , geometryFormat = require('../format/geoJsonFormat')
  , gm = require('gm');

var attachmentConfig = config.server.attachment;
var attachmentBase = attachmentConfig.baseDirectory;
var attachmentProcessing = attachmentConfig.processing;

var createAttachmentPath = function(layer) {
  var now = new Date();
  return path.join(
    layer.collectionName, 
    now.getFullYear().toString(), 
    (now.getMonth() + 1).toString(), 
    now.getDate().toString()
  );
}

var moveImage = function(path, outputFile, callback) {
  if (attachmentProcessing && attachmentProcessing.orientImages) {
    gm(path).autoOrient().write(outputFile, callback);
  } else {
    fs.rename(path, outputFile, callback);
  }
}

var generateThumbnails = function(layer, attachment, file, featureId) {
  var relativePath = createAttachmentPath(layer);
  attachmentProcessing.thumbSizes.forEach(function(thumbSize) {
    var thumbRelativePath = path.join(relativePath, path.basename(attachment.name, path.extname(attachment.name))) + "_" + thumbSize + path.extname(attachment.name);
    var outputPath = path.join(attachmentBase, thumbRelativePath);
    gm(file).size(function(err, size) {
      gm(file)
        .resize(size.width <= size.height ? thumbSize : null, size.height < size.width ? thumbSize : null)
        .write(outputPath, function(err) {
          if (err) {
            console.log('Error thumbnailing file to size: ' + thumbSize, err);
          } else {
            // write to mongo
            gm(outputPath).identify(function(err, identity) {
              if (!err) {
                var stat = fs.statSync(outputPath);

                FeatureModel.addAttachmentThumbnail(layer, featureId, attachment._id, 
                  { size: stat.size, 
                    name: path.basename(attachment.name, path.extname(attachment.name)) + "_" + thumbSize + path.extname(attachment.name),
                    relativePath: thumbRelativePath, 
                    contentType: attachment.contentType,
                    height: identity.size.height,
                    width: identity.size.width},
                function(err) {
                  if (err) console.log('error writing thumb to db', err);
                  else console.log('wrote thumb');
                });
              }
            })
          }
        });
      });
    });
}

var processImage = function(layer, featureId, attachment, outputFile, callback) {
  moveImage(attachment.path, outputFile, function(err) {
    if (err) {
      callback(err);
      return;
    }

    FeatureModel.addAttachment(layer, featureId, attachment, function(err, newAttachment) {
      if (err) return callback(err);
      callback(err, newAttachment);
      // generate thumbnails if we need to
      if (attachmentProcessing.thumbSizes) {
        generateThumbnails(layer, newAttachment, outputFile, featureId);
      }
    });
  });
}

var processOtherAttachment = function(layer, featureId, attachment, outputFile, callback) {
  fs.rename(attachment.path, outputFile, function(err) {
    if (err) {
      callback(err);
      return;
    }

    FeatureModel.addAttachment(layer, featureId, attachment, function(err, newAttachment) {
      if (err) return callback(err);
      callback(err, newAttachment);
    });
  });
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

  if (attachment) attachment.path = path.join(attachmentBase, attachment.relativePath);
  if (attachment.thumbnails) {
    for (var i = 0; i < attachment.thumbnails.length; i++) {
      attachment.thumbnails[i].path = path.join(attachmentBase, attachment.thumbnails[i].relativePath);
    }
  }

  return callback(null, attachment);
}

Attachment.prototype.create = function(id, attachment, callback) {
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

    var extension = path.extname(fileName).toLowerCase();
    switch(extension) {
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
        // OK it is an image, let's do this
        processImage(layer, id, attachment, file, callback);
        break;
      default:
        processOtherAttachment(layer, id, attachment, file, callback);
    }

    
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