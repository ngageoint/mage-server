exports.id = 'remove-export-ttl-index';
const exportCollectionName = 'exports';

exports.up = async function(done) {
  try {
    let exportCollection
    try {
      exportCollection = await this.db.collection(exportCollectionName);
      await exportCollection.dropIndexes();
    } catch (err) {}

    done();
  } catch (err) {
    done(err);
  }
};

exports.down = async function(done) {
};
