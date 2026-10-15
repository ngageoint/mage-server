exports.id = 'add-static-icon-collection';
const staticIconCollectionName = 'static_icons';

exports.up = async function(done) {
  try {
    let staticIconCollection
    try {
      staticIconCollection = await this.db.collection(staticIconCollectionName);
      await staticIconCollection.dropIndexes();
    } catch (err) {
      staticIconCollection = await this.db.createCollection(staticIconCollectionName);
    }
    await staticIconCollection.createIndex({ sourceUrl: 1 }, { unique: true, sparse: true, background: true });

    await this.db.collection("roles").updateOne({name: 'ADMIN_ROLE'}, {$push : {permissions: 'STATIC_ICON_WRITE'}});
    done();
  } catch (err) {
    done(err);
  }
};

exports.down = async function(done) {
  try {
    await this.db.collection("roles").updateOne({name: 'ADMIN_ROLE'}, {$pull : {permissions: 'STATIC_ICON_WRITE'}});
    done();
  } catch (err) {
    done(err);
  }
};