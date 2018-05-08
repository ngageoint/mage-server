var express = require("express")
  , session = require('express-session')
  , passport = require('passport')
  , path = require('path')
  , config = require('./config.js')
  , provision = require('./provision')
  , log = require('./logger');

var app = express();
app.use(function(req, res, next) {
  req.getRoot = function() {
    return req.protocol + "://" + req.get('host');
  };

  req.getPath = function() {
    return req.getRoot() + req.path;
  };

  return next();
});

app.set('config', config);
app.enable('trust proxy');

app.set('view engine', 'pug');

app.use(function(req, res, next) {
  req.getRoot = function() {
    return req.protocol + "://" + req.get('host');
  };
  return next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'identity-oidc-expressjs-secret',
  name: 'identity-oidc-expressjs-session',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 300000
  }
}));

passport.serializeUser(function(user, done) { 
  console.log('------------Attempt to serialize user', user.username);
  done(null, user); 
});

passport.deserializeUser(function(user, done) { 
  console.log('------------Attempt to deserialize user', user.username);
  user._id = user.id;
  done( null, user); 
}); // this is where you might fetch a user record from the database. see http://www.passportjs.org/docs/configure/#sessions

app.use(require('body-parser')({ keepExtensions: true}));
app.use(require('multer')());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public/dist')));
app.use('/api/swagger', express.static('./public/vendor/swagger-ui/'));
app.use('/private',
  passport.authenticate('bearer'),
  express.static(path.join(__dirname, 'private')));

// Configure authentication
var provisioning = require('./provision/' + config.api.provision.strategy)(provision);
var authentication = require('./authentication')(app, passport, provisioning, config.api.authenticationStrategies);

// Configure routes
require('./routes')(app, {authentication: authentication, provisioning: provisioning});

app.use(function(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (process.env.NODE_ENV !== 'test') {
    log.error(err.message);
    log.error(err.stack);
  }

  var status = err.status || 500;
  var msg = status === 500 ? 'Internal server error, please contact MAGE administrator.' : err.message;
  if (err.name === 'ValidationError') {
    msg = {
      message: err.message,
      errors: err.errors
    };

    return res.status(400).json(msg);
  }

  res.status(status).send(msg);
});

module.exports = app;
