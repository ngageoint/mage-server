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

var attachmentBase = config.server.attachmentBaseDirectory;
var thumbnailSizes = config.server.thumbnails.sizes;

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

    gm(attachment.path).autoOrient().write(file, function(err) {
      if (err) {
        console.log("error auto orienting", err);
        callback(err);
        return;
      }

      FeatureModel.addAttachment(layer, id, attachment, function(err, newAttachment) {
        if (err) return callback(err);
        callback(err, newAttachment);
        thumbnailSizes.forEach(function(thumbSize) {
        var thumbRelativePath = path.join(relativePath, path.basename(attachment.path, path.extname(attachment.path))) + "_" + thumbSize + path.extname(attachment.path);
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

                    FeatureModel.addAttachmentThumbnail(layer, id, newAttachment._id, 
                      { size: stat.size, 
                        name: path.basename(attachment.name, path.extname(attachment.name)) + "_" + thumbSize + path.extname(attachment.name),
                        relativePath: thumbRelativePath, 
                        contentType: attachment.headers['content-type'],
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