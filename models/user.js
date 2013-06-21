module.exports = function(mongoose) {

  var hasher = require('../utilities/pbkdf2')();

  // Creates a new Mongoose Schema object
  var Schema = mongoose.Schema; 

  // Collection to hold users
  var UserSchema = new Schema({
      username: { type: String, required: true },
      p***REMOVED***word: { type: String, required: true },
      firstname: { type: String, required: true },
      lastname: {type: String, required: true },
      email: {type: String, required: true },
      roles: [Schema.Types.String],
      teams: [Schema.Types.ObjectId],
    },{ 
      versionKey: false 
    }
  );

  UserSchema.method('validP***REMOVED***word', function(p***REMOVED***word, callback) {
    var user = this;
    hasher.validP***REMOVED***word(p***REMOVED***word, user.p***REMOVED***word, callback);
  });

  UserSchema.pre('save', function(next) {
    var user = this;

    // only hash the p***REMOVED***word if it has been modified (or is new)
    //if (!user.isModified('p***REMOVED***word')) return next();

    hasher.encryptP***REMOVED***word(user.p***REMOVED***word, function(err, encryptedP***REMOVED***word) {
      user.p***REMOVED***word = encryptedP***REMOVED***word;
      next();
    });
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

  var setRolesForUser = function(user, roles, callback) {

  }

  var removeRolesForUser = function(user, roles, callback) {

  }

  var setGroupForUser = function(user, group, callback) {

  }

  var removeGroupForUser = function(user, group, callback) {

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