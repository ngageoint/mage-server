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

exports.createSchema = function(schema, callback) {
  SchemaModel.findOneAndUpdate({typeName: schema.typeName}, schema, {upsert: true}, callback);
};

exports.updateAttributeDescriptors = function(event, descriptors, callback) {
  var update = {
    $set: {
      attributeDescriptors: descriptors
    }
  };

  SchemaModel.findOneAndUpdate({typeName: 'observations' + event._id}, update, callback);
};
