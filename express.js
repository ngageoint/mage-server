const express = require("express")
  , crypto = require('crypto')
  , session = require('express-session')
  , bodyParser = require('body-parser')
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

  return next();
});

const secret = crypto.randomBytes(64).toString('hex');
app.use(session({ secret: secret }));

app.set('config', config);
app.enable('trust proxy');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser({
  limit: '16mb',
  keepExtensions: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'web-app/dist')));
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
require('./routes')(app, { authentication: authentication });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(function(err, req, res, next) { // Express requires a 4 parameter function callback, dont' remove unused next parameter
  if (process.env.NODE_ENV !== 'test') {
    log.error(err.message);
    log.error(err.stack);
  }

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

module.exports = app;
