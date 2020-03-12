var Counter = require('../models/counter')

exports.id = 'create-initial-osm-layer';

exports.up = async function(done) {
  console.log('\nCreating open street map layer...');

  try {
    await createOSMLayer(this.db);
    done();
  } catch (err) {
    console.log('Failed layer migration', err);
    done(err);
  }
};

async function createOSMLayer(db) {
  const id = await Counter.getNext('layer');

  var osm = {
    _id: id,
    name: "Open Street Map",
    type: "Imagery",
    format: "XYZ",
    base: true,
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };
  
  const collection = db.collection('layers');
  await collection.insert(osm);
}

exports.down = function(done) {
  const collection = this.db.collection('layers');
  collection.remove({ name: "Open Street Map" })
    .then(() => {
      done();
    })
    .catch(err => {
      done(err);
    });
};
