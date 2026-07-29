exports.id = '007-user-icon';

exports.up = async function (done) {
  this.log('updating user icons');
  const users = this.db.collection('users');
  const userCursor = users.find()
  try {
    for await (const userDoc of userCursor) {
      const icon = userDoc.icon || {}
      icon.type = icon.relativePath ? 'upload' : 'none'
      await users.updateOne({ _id: userDoc._id }, { $set: { icon }})
    }
    done()
  }
  catch (err) {
    done(err)
  }
};

exports.down = function (done) {
  done();
};
