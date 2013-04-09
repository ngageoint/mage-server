module.exports = function(mongoose, counters) {

  var Schema = mongoose.Schema;
  // Creates the Schema for the Features object (mimics ESRI)
  var AttachmentSchema = new Schema({
    id: { type: Number, required: true, unique: true },
    contentType: { type: String, required: false },  
    size: { type: String, required: false },  
    name: { type: String, required: false },
    relativePath: { type: String, required: true }
  });

  // Creates the Schema for the Attachments object
  var FeatureSchema = new Schema({
    geometry: {
      x: { type: Number, required: false },  
      y: { type: Number, required: false }
    },  
    attributes: Schema.Types.Mixed,
    attachments: [AttachmentSchema]
  });

  var models = {};

  var featureModel = function(layer) {
    var name = layer.collectionName;
    var model = models[name];
    if (!model) {
      // Creates the Model for the Features Schema
      var model = mongoose.model(name, FeatureSchema, name);
      models[name] = model;
    }

    return model;
  }

  var getFeatures = function(layer, callback) {
    var query = {};
    var fields = {'attachments': 0}; 
    featureModel(layer).find(query, fields, function (err, features) {
      if (err) {
        console.log("Error finding features in mongo: " + err);
      }

      callback(features);
    });
  }

  var getFeatureByObjectId = function(layer, objectId, callback) {
    var query = {'attributes.OBJECTID': objectId};
    featureModel(layer).findOne(query, function (err, feature) {
      if (err) {
        console.log("Error finding feature in mongo: " + err);
      }

      callback(feature);
    });
  }

  var getFeatureById = function(layer, id, callback) {
    var fields = {'attachments': 0}; 
    featureModel(layer).findOne(id, fields, function (err, feature) {
      if (err) {
        console.log("Error finding feature in mongo: " + err);
      }

      callback(feature);
    });
  }

  var createFeatures = function(layer, data, callback) {
    var counter = 'feature' + layer.id;
    counters.getGroup(counter, data.length, function(ids) {
      var features = [];
      data.forEach(function(feature, index) {
        features.push({
          geometry: {
            x: feature.geometry.x ? feature.geometry.x : "",
            y: feature.geometry.y ? feature.geometry.y : ""
          },
          attributes: {
            OBJECTID: ids[index],
            ADDRESS: feature.attributes.ADDRESS ? feature.attributes.ADDRESS : "",  
            EVENTDATE: feature.attributes.EVENTDATE ? feature.attributes.EVENTDATE : "",
            TYPE: feature.attributes.TYPE ? feature.attributes.TYPE : "",  
            EVENTLEVEL: feature.attributes.EVENTLEVEL ? feature.attributes.EVENTLEVEL : "",  
            TEAM: feature.attributes.TEAM ? feature.attributes.TEAM : "", 
            DESCRIPTION: feature.attributes.DESCRIPTION ? feature.attributes.DESCRIPTION : "",  
            USNG: feature.attributes.USNG ? feature.attributes.USNG : "",  
            EVENTCLEAR: feature.attributes.EVENTCLEAR ? feature.attributes.EVENTCLEAR : "",
            UNIT: feature.attributes.UNIT ? feature.attributes.UNIT : ""
          }
        });
      });

      var Feature = featureModel(layer);
      Feature.create(features, function(err) {
        var newFeatures = err ? [] : Array.prototype.slice.call(arguments, 1);

        if (err) {
          console.log(JSON.stringify(err));
        }

        callback(features, newFeatures);
      });
    });
  }

  var updateFeature = function(layer, data, callback) {
    var query = {'attributes.OBJECTID': data.attributes.OBJECTID};
    var update = {
      geometry: {
        x: data.geometry.x ? data.geometry.x : "",
        y: data.geometry.y ? data.geometry.y : ""
      },
      attributes: {
        OBJECTID: data.attributes.OBJECTID,
        ADDRESS: data.attributes.ADDRESS ? data.attributes.ADDRESS : "",  
        EVENTDATE: data.attributes.EVENTDATE ? data.attributes.EVENTDATE : "",
        TYPE: data.attributes.TYPE ? data.attributes.TYPE : "",  
        EVENTLEVEL: data.attributes.EVENTLEVEL ? data.attributes.EVENTLEVEL : "",  
        TEAM: data.attributes.TEAM ? data.attributes.TEAM : "", 
        DESCRIPTION: data.attributes.DESCRIPTION ? data.attributes.DESCRIPTION : "",  
        USNG: data.attributes.USNG ? data.attributes.USNG : "",  
        EVENTCLEAR: data.attributes.EVENTCLEAR ? data.attributes.EVENTCLEAR : "",
        UNIT: data.attributes.UNIT ? data.attributes.UNIT : ""
      }
    };

    var options = {new: true};
    featureModel(layer).findOneAndUpdate(query, update, options, function (err, feature) {
      if (err) {
        console.log('Could not update feature', err);
      }

      callback(err, update, feature);
    });
  }

  var removeFeature = function(layer, objectId, callback) {
    var query = {'attributes.OBJECTID': objectId};
    featureModel(layer).findOneAndRemove(query, function (err, feature) {
      if (err) {
        console.log('Could not remove feature', err);
      }

      callback(err, objectId, feature);
    });
  }

  var getAttachments = function(feature, callback) {
    callback(feature.get('attachments'));
  }

  var getAttachment = function(feature, attachmentId, callback) {
    var attachments = feature.get('attachments').filter(function(attachment) {
      return (attachment.id == attachmentId);
    });

    var attachment = attachments.length ? attachments[0] : null;
    callback(attachment);
  }

  var addAttachment = function(layer, objectId, file, callback) {
    var attachment = {
      id: file.id,
      contentType: file.type,  
      size: file.size,  
      name: file.name,
      relativePath: file.relativePath
    };

    var condition = {'attributes.OBJECTID': objectId};
    var update = {'$push': { attachments: attachment } };
    featureModel(layer).update(condition, update, function(err, feature) {
      if (err) {
        console.log('Error updating attachments from DB', err);
      }

      callback(err, attachment);
    });
  }

  var updateAttachment = function(layer, attachmentId, file, callback) {
    var condition = {'attachments.id': attachmentId};
    var update = {
      '$set': {
        'attachments.$.name': filesname,
        'attachments.$.type': file.type,
        'attachments.$.size': file.size
      }
    };

    featureModel(layer).update(condition, update, function(err, feature) {
      if (err) {
        console.log('Error updating attachments from DB', err);
      }

      callback(err);
    });
  }

  var removeAttachments = function(feature, attachmentIds, callback) {
    feature.update({'$pull': {attachments: {id: {'$in': attachmentIds}}}}, function(err, number, raw) {
      if (err) {
        console.log('Error pulling attachments from DB', err);
      }

      callback(err);
    });
  }

  return {
    getFeatures: getFeatures,
    getFeatureById: getFeatureById,
    getFeatureByObjectId: getFeatureByObjectId,
    createFeatures: createFeatures,
    updateFeature: updateFeature,
    removeFeature: removeFeature,
    getAttachments: getAttachments,
    getAttachment: getAttachment,
    addAttachment: addAttachment,
    updateAttachment: updateAttachment,
    removeAttachments: removeAttachments
  }
}