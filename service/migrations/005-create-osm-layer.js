var api = require('../api');

exports.id = 'create-initial-osm-layer';

exports.up = function(done) {
  console.log('\nCreating open street map layer...');

  var osm = {
    name: "Open Street Map",
    type: "Imagery",
    format: "XYZ",
    base: true,
    url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  new api.Layer().create(osm)
    .then(() => done())
    .catch(err => done(err));
};

exports.down = function(done) {
  new api.Layer().remove({name: "Open Street Map"})
    .then(() => done())
    .catch(err => done(err));
};
