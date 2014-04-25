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

var imageProcessingQueue = async.queue(function(task, callback) {
  console.log('trying to process image task ' + task.type);
  if (task.type == 'orient') {
    orientImage(task.layer, task.featureId, task.attachment, callback);
  } else if (task.type == 'thumbnail') {
    generateThumbnails(task.layer, task.featureId, task.attachment, callback);
  } else {
    console.log("Unrecognized task " + task.type + " doing nothing...");
    callback();
  }
}, attachmentProcessing.queueSize);

var orientImage = function(layer, featureId, attachment, callback) {
  var file = path.join(attachmentBase, attachment.relativePath);
  var outputFile =  file + "_orient";
  console.log("file", file);

  gm(file).define("jpeg:preserve-settings").autoOrient().write(outputFile, function(err) {
    fs.rename(outputFile, file, function(err) {
      if (err) return callback(err);

      var stat = fs.statSync(file);
      FeatureModel.updateAttachment(layer, featureId, attachment._id, {size: stat.size}, function(err, feature) {
        imageProcessingQueue.push({type: 'thumbnail', layer: layer, featureId: featureId, attachment: attachment}, function(err) {
          if (err) console.log("Error orienting image", err)
        });
        callback();
      });
    });
  });
}

var generateThumbnails = function(layer, featureId, attachment, done) {
  var file = path.join(attachmentBase, attachment.relativePath);
  var relativePath = createAttachmentPath(layer);

  async.eachSeries(attachmentProcessing.thumbSizes, function(thumbSize, callback) {
    var thumbRelativePath = path.join(relativePath, path.basename(attachment.name, path.extname(attachment.name))) + "_" + thumbSize + path.extname(attachment.name);
    var outputPath = path.join(attachmentBase, thumbRelativePath);
    console.log('thumbnailing start');

    gm(file).size(function(err, size) {
      console.log('thumbnailing got original size');

      if (err) callback(err);
      gm(file)
        .resize(size.width <= size.height ? thumbSize : null, size.height < size.width ? thumbSize : null)
        .write(outputPath, function(err) {
          if (err) {
            console.log('Error thumbnailing file to size: ' + thumbSize, err);
            callback(err);
            return;
          } else {
            // write to mongo
            console.log('Finished thumbnailing ' + thumbSize);

            gm(outputPath).identify(function(err, identity) {
              console.log('thumbnailing get new size ' + identity.size.height + "x" + identity.size.width);
              if (err) {
                console.log('error getting informatin about ' + outputPath);
                callbacK(err);
                return;
              }
              if (!err) {
                var stat = fs.statSync(outputPath);

                FeatureModel.addAttachmentThumbnail(layer, featureId, attachment._id, { 
                  size: stat.size, 
                  name: path.basename(attachment.name, path.extname(attachment.name)) + "_" + thumbSize + path.extname(attachment.name),
                  relativePath: thumbRelativePath, 
                  contentType: attachment.contentType,
                  height: identity.size.height,
                  width: identity.size.width
                },
                function(err) {
                  if (err) console.log('error writing thumb to db', err);

                  console.log('thumbnailing wrote thumb metadata to db');

                  callback(err);
                });
              }
            })
          }
        });
      });
  }, function(err) {
    if (err) {
      console.log('error thumbnailing', err);
    } else {
      console.log('Finished thumbnailing ' + attachment.name);
    }

    done(err);
  });
    
}

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

  if (attachment) attachment.path = path.join(attachmentBase, attachment.relativePath);
  if (attachment.thumbnails) {
    for (var i = 0; i < attachment.thumbnails.length; i++) {
      attachment.thumbnails[i].path = path.join(attachmentBase, attachment.thumbnails[i].relativePath);
    }
  }

  return callback(null, attachment);
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

    var image = false;
    var extension = path.extname(fileName).toLowerCase();
    switch(extension) {  // TODO should probably use the mime type here
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
        // OK it is an image, let's do this
        image = true;
        break;
    }

    fs.rename(attachment.path, file, function(err) {
      if (err) {
        callback(err);
        return;
      }

      FeatureModel.addAttachment(layer, featureId, attachment, function(err, newAttachment) {
        if (err) return callback(err);
        callback(err, newAttachment);

        if (image && attachmentProcessing && attachmentProcessing.orientImages) {
          // push image orientation to front of queue
          imageProcessingQueue.unshift({type: 'orient', layer: layer, featureId: featureId, attachment: newAttachment}, function(err) {
            if (err) console.log("Error orienting image", err)
          });
        }
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