var async = require('async')
  , mongoose = require('mongoose')
  , log = require('winston');

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
  SchemaModel.findOneAndUpdate({typeName: schema.typeName}, schema, {upsert: true})
    .then(result => { if (callback) callback(null, result); }, err => { if (callback) callback(err); });
};

exports.updateAttributeDescriptors = function(event, descriptors, callback) {
  var update = {
    $set: {
      attributeDescriptors: descriptors
    }
  };

  SchemaModel.findOneAndUpdate({typeName: 'observations' + event._id}, update, {})
    .then(result => { if (callback) callback(null, result); }, err => { if (callback) callback(err); });
};

exports.removeSchema = function(event, callback) {
  Promise.all([
    SchemaModel.deleteMany({typeName: 'observations' + event._id})
      .catch(err => { log.error('Error removing observations schema', err); throw err; }),
    SchemaModel.deleteMany({typeName: 'locations' + event._id})
      .catch(err => { log.error('Error removing locations schema', err); throw err; })
  ]).then(() => { if (callback) callback(null); }, err => { if (callback) callback(err); });
};
