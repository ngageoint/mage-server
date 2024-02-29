const express = require("express")
  , crypto = require('crypto')
  , session = require('express-session')
  , fs = require('fs')
  , passport = require('passport')
  , path = require('path')
  , config = require('./config.js')
  , provision = require('./provision')
  , log = require('./logger')
  , api = require('./api')
  , env = require('./environment/env')
  , yaml = require('yaml')
  , AuthenticationInitializer = require('./authentication');

const app = express();
app.use(function(req, res, next) {
  req.getRoot = function() {
    return req.protocol + "://" + req.get('host');
  };

  req.getPath = function() {
    return req.getRoot() + req.path;
  };

  if (process.env.MAGE_HTTP_DEBUG === 'true') {
    console.debug(`[HTTP REQUEST] ${req.method} ${req.getPath()}\n`, req.rawHeaders)
  }

  return next();
});

const secret = crypto.randomBytes(64).toString('hex');
app.use(session({ secret }));

app.set('config', config);
app.enable('trust proxy');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

const jsonOptions = { limit: '16mb', strict: false };
app.use(
    express.json(jsonOptions),
    express.urlencoded( { ...jsonOptions, extended: true }));

app.use(passport.initialize());
app.use(passport.session());
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
const authentication = AuthenticationInitializer.initialize(app, passport, provision);

// Configure routes
// TODO: don't pass authentication to other routes, but enforce authentication ahead of adding route modules
require('./routes')(app, { authentication });

// Express requires a 4 parameter function callback, do not remove unused next parameter
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(function(err, req, res, next) {

  log.error('\n-----\nunhandled error during request\n', req.method, req.path, err, '\n-----')

  const status = err.status || 500;
  let msg = status === 500 ? 'Internal server error, please contact MAGE administrator.' : err.message;
  if (err.name === 'ValidationError') {
    msg = {
      message: err.message,
      errors: err.errors
    };

    return res.status(400).json(msg);
  }

  res.status(status).send(msg);
});

module.exports = { app, auth: authentication };
