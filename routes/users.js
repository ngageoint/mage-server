module.exports = function(app, models, fs, transformers, async, utilities) {
  var p***REMOVED***port = utilities.auth.p***REMOVED***port;
  var strategy = utilities.auth.strategy;

  var validateUserParams = function(req, res, next) {
    var invalidResponse = function(param) {
      return "Cannot create user, invalid parameters.  '" + param + "' parameter is required";
    }

    var username = req.param('username');
    if (!username) {
      res.send(400, invalidResponse('username'));
    }

    var firstname = req.param('firstname');
    if (!firstname) {
      res.send(400, invalidResponse('firstname'));
    }

    var lastname = req.param('lastname');
    if (!lastname) {
      res.send(400, invalidResponse('lastname'));
    }

    var email = req.param('email');
    if (!email) {
      res.send(400, invalidResponse('email'));
    }

    var p***REMOVED***word = req.param('p***REMOVED***word');
    if (!p***REMOVED***word) {
      res.send(400, invalidResponse('p***REMOVED***word'));
    }

    var p***REMOVED***wordconfirm = req.param('p***REMOVED***wordconfirm');
    if (!p***REMOVED***wordconfirm) {
      res.send(400, invalidResponse('p***REMOVED***wordconfirm'));
    }

    if (p***REMOVED***word != p***REMOVED***wordconfirm) {
      res.send(400, 'p***REMOVED***words do not match');
    }

    req.user = {
      username: username,
      firstname: firstname,
      lastname: lastname,
      email: email,
      p***REMOVED***word: p***REMOVED***word
    }

    next();
  }

  // Grab the user for any endpoint that uses userId
  app.param('userId', function(req, res, next, userId) {
      models.User.getUserById(userId, function(user) {
        if (!user) return res.send('User not found', 404);
        req.user = user;
        next();
      });
  });

  // login
  app.post(
    '/api/login',
    p***REMOVED***port.authenticate(strategy),
    function(req, res) {
      res.send(200, 'successfully logged in');
    }
  );

  // get all uses
  app.get(
    '/api/users', 
    p***REMOVED***port.authenticate(strategy), 
      function (req, res) {
      models.User.getUsers(function (users) {
        res.json(users);
      });
  });

  // get user by id
  app.get( 
    '/api/users/:userId',
    p***REMOVED***port.authenticate(strategy),
    function(req, res) {
     res.json(req.user);
    }
  );

  // Create a new user
  app.post(
    '/api/users',
    validateUserParams, 
    function(req, res) {
      models.User.createUser(req.user, function(err, newUser) {
        if (err) {
          return res.send(400, err);
        }

        res.json(newUser);
      });
    }
  );

  // Update a user
  app.post(
    '/api/users/:userId', 
    p***REMOVED***port.authenticate(strategy),
    validateUserParams, 
    function(req, res) {
      models.User.updateUser(req.user, function(err, updatedUser) {
        if (err) {
          return res.send(400, err);
        }

        res.json(updatedUser);
      });
    }
  );

  // Delete a user
  app.delete(
    '/api/users/:userId', 
    p***REMOVED***port.authenticate(strategy),
    function(req, res) {
      models.User.deleteUser(req.user, function(err, updatedUser) {
        if (err) {
          return res.send(400, err);
        }

        res.json(updatedUser);
      });
    }
  );

}