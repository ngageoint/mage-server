const express = require("express")
  , crypto = require('crypto')
  , cookieSession = require('cookie-session')
  , fs = require('fs')
  , passport = require('passport')
  , path = require('path')
  , config = require('./config.js')
  , provision = require('./provision')
  , log = require('./logger')
  , api = require('./api')
  , env = require('./environment/env')
  , yaml = require('yaml');

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

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(function(req, res, next) {
  req.getRoot = function() {
    return req.protocol + "://" + req.get('host');
  };
  return next();
});

const secret = crypto.randomBytes(64).toString('hex');
app.use(cookieSession({
  secret: secret,
  name: 'mage-session',
  maxAge: 2 * 60 * 1000, // 2 minutes
  secure: env.cookies.secure,
  sameSite: true
}));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  new api.User().getById(id, function(err, user) {
    done(err, user);
  });
});

app.use(require('body-parser')({
  limit: '16mb',
  keepExtensions: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public/mage-app/dist')));
app.get('/api/docs/openapi.yaml', async function(req, res) {
  const docPath = path.resolve(__dirname, 'docs', 'openapi.yaml');
  fs.readFile(docPath, (err, contents) => {
    const doc = yaml.parse(contents.toString('utf-8'));
    doc.servers = [{ url: req.getRoot() }];
    res.contentType('text/yaml; charset=utf-8').send(yaml.stringify(doc));
  });
});
app.use('/api/docs', express.static(path.join(__dirname, 'docs')));
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
