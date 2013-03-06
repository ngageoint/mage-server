module.exports = function(mongoose, counters) {
  // This is the sequence/counter model for one-up fields like OBJECTID
  var counters = require('./counters')(mongoose);

  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;

  // Creates the Schema for the Features object (mimics ESRI)
  var AttachmentSchema = new Schema({
      id: { type: Number, required: true, index: {unique: true} },
      contentType: { type: String, required: false },  
      size: { type: String, required: false },  
      name: { type: String, required: false }
    },{
      versionKey: false 
    }
  );

  // Creates the Schema for the Attachments object
  var FeatureSchema = new Schema({  
      geometry: {
        x: { type: Number, required: false },  
        y: { type: Number, required: false }
      },  
      attributes: {
        OBJECTID: { type: Number, required: true, index: {unique: true} },  
        ADDRESS: { type: String, required: false},  
        EVENTDATE: { type: Number, unique: false },  
        TYPE: { type: String, required: false },  
        EVENTLEVEL: { type: String, required: false },  
        TEAM: { type: String, unique: false }, 
        DESCRIPTION: { type: String, required: false },  
        USNG: { type: String, required: false },  
        EVENTCLEAR: { type: Number, unique: false },
        UNIT: { type: String, required: false }
      },
      attachments: [AttachmentSchema]
    },{ 
      versionKey: false 
    }
  );

  // Creates the Model for the Features Schema
  var Feature = mongoose.model('Feature', FeatureSchema);

  var getFeatures = function(callback) {
    var query = {};
    Feature.find(query, function (err, features) {
      if (err) {
        console.log("Error finding features in mongo: " + err);
      }

      callback(features);
    });
  }

  var getFeature = function(id, callback) {
    var query = {"attributes.OBJECTID": id};
    Feature.findOne(query, function (err, feature) {
      if (err) {
        console.log("Error finding feature in mongo: " + err);
      }
      callback(feature);
    });
  }

  var createFeature = function(data, callback) {
    counters.getNext('feature', function(id) {
      var feature = new Feature({
      geometry: {
        x: data.geometry.x ? data.geometry.x : "",
        y: data.geometry.y ? data.geometry.y : ""
      },
      attributes: {
        OBJECTID: id,
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
      });

      feature.save(function(err, feature) {
        if (err) {
          console.log(JSON.stringify(err));
        }

        callback(err, feature);
      });
    });
  }

  var updateFeature = function(attributes, callback) {
    console.log("Updating feature with id: " + attributes.OBJECTID);

    var query = {"attributes.OBJECTID": attributes.OBJECTID};
    var update = {
      attributes: {
        OBJECTID: attributes.OBJECTID,
        ADDRESS: attributes.ADDRESS ? attributes.ADDRESS : "",  
        EVENTDATE: attributes.EVENTDATE ? attributes.EVENTDATE : "",
        TYPE: attributes.TYPE ? attributes.TYPE : "",  
        EVENTLEVEL: attributes.EVENTLEVEL ? attributes.EVENTLEVEL : "",  
        TEAM: attributes.TEAM ? attributes.TEAM : "", 
        DESCRIPTION: attributes.DESCRIPTION ? attributes.DESCRIPTION : "",  
        USNG: attributes.USNG ? attributes.USNG : "",  
        EVENTCLEAR: attributes.EVENTCLEAR ? attributes.EVENTCLEAR : "",
        UNIT: attributes.UNIT ? attributes.UNIT : ""
      }
    };
    var options = {new: true};
    Feature.findOneAndUpdate(query, update, options, function (err, feature) {
      if (err) {
        console.log(JSON.stringify(err));
      }
      callback(err, feature);
    });
  }

  var getAttachments = function(featureId, callback) {
    var query = {'attributes.OBJECTID': featureId};
    var fields = {'attachments': 1};
    Feature.findOne(query, fields, function (err, feature) {
      if (err) {
        console.log("Error finding attachments for featureId: " + featureId + "." + err);
      }

      var attachments = feature ? feature.attachments : null;
      callback(attachments);
    });
  }

  var getAttachment = function(featureId, attachmentId, callback) {
    var query = {'attributes.OBJECTID': featureId, 'attachments.id': attachmentId};
    var fields = {'attachments.$': 1};
    Feature.findOne(query, fields, function(err, feature) {
      var attachment;
      if (feature && feature.attachments.length > 0) {
        attachment = feature.attachments[0];
      }

      callback(attachment);
    });
  }

  var addAttachment = function(feature, files, callback) {
    counters.getNext('attachment', function(id) {
      var attachment = {
        id: id,
        contentType: files.attachment.type,  
        size: files.attachment.size,  
        name: files.attachment.name
      };

      feature.attachments.push(attachment);

      feature.save(function(err, feature) {
        if (err) {
          console.log(JSON.stringify(err));
        }

        callback(err, attachment);
      });
    });
  }

  var removeAttachment = function(feature, attachmentId, callback) {
    if (feature.attachments == null) return;

    feature.attachments.forEach(function(attachment) {
      if (attachment.id == attachmentId) {
        feature.attachments.remove(attachment);
      }
    });

    var query = {'attributes.OBJECTID': featureId};
    Attachment.remove(query, function(err) {
      callback(err);
    });
  }

  return {
    getFeatures: getFeatures,
    getFeature: getFeature,
    createFeature: createFeature,
    updateFeature: updateFeature,
    getAttachments: getAttachments,
    getAttachment: getAttachment,
    addAttachment: addAttachment,
    removeAttachment: removeAttachment
  }
}