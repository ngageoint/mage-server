module.exports = function(mongoose) {
  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema;  

  // Collection to hold users
  var UserSchema = new Schema({
      username: { type: String, required: true },
      p***REMOVED***word: { type: String, required: true },
      firstname: { type: String, required: true },
      lastname: {type: String, required: true },
      email: {type: String, required: true },
      roles: [Schema.Types.ObjectId],
      teams: [Schema.Types.ObjectId],
    },{ 
      versionKey: false 
    }
  );

  UserSchema.method('validP***REMOVED***word', function(p***REMOVED***word) {
    console.log('validating p***REMOVED***word.......');
    return p***REMOVED***word == this.p***REMOVED***word;
  });

  // Creates the Model for the User Schema
  var User = mongoose.model('User', UserSchema);

  var getUserById = function(id, callback) {
    User.findById(id, callback);
  }

  var getUserByUsername = function(username, callback) {
    var query = {username: username};
    User.findOne(query, callback);
  }

  var getUsers = function(callback) {
    var query = {};
    User.find(query, function (err, users) {
      if (err) {
        console.log("Error finding users in mongo: " + err);
      }

      callback(users);
    });
  }

  var createUser = function(user, callback) {
    //TODO need to SALT and HASH the p***REMOVED***word before putting into db

    var create = {
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      p***REMOVED***word: user.p***REMOVED***word
    }

    User.create(create, callback);
  }

  var updateUser = function(user, callback) {
    // TODO need to SALT and HASH the p***REMOVED***word before putting into db

    var update = {
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      p***REMOVED***word: user.p***REMOVED***word
    }

    User.findByIdAndUpdate(user._id, update, callback);
  }

  var deleteUser = function(user, callback) {
    var conditions = { _id: user._id };
    User.remove(conditions, callback);
  }

  return {
    getUserById: getUserById,
    getUserByUsername: getUserByUsername,
    getUsers: getUsers,
    createUser: createUser,
    updateUser: updateUser,
    deleteUser: deleteUser
  }
}