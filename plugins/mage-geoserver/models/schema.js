var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GeoServerSchema = new Schema({
  typeName: {type: String, required: true},
  userData: {
    collection: {type: String}
  },
  geometryDescriptor: {
    localName: {type: String},
    crs: {
      type: {type: String},
      properties: {
        name: {type: String}
      }
    }
  },
  attributeDescriptors: [Schema.Types.Mixed]
});

var SchemaModel = mongoose.model('Schema', GeoServerSchema);

exports.createSchema = function(event, descriptors, callback) {
  var schema = {
    typeName: 'observations' + event._id,
    userData: {
      collection: 'observations' + event._id
    },
    geometryDescriptor: {
      localName: "geometry",
      crs: {
        type: "name",
        properties: {
          name: "urn:ogc:def:crs:EPSG:4326"
        }
      }
    },
    attributeDescriptors: descriptors
  };

  SchemaModel.findOneAndUpdate({typeName: 'observations' + event._id}, schema, {upsert: true}, callback);
};

exports.updateAttributeDescriptors = function(event, descriptors, callback) {
  var update = {
    $set: {
      attributeDescriptors: descriptors
    }
  };

  SchemaModel.findOneAndUpdate({typeName: 'observations' + event._id}, update, callback);
};
