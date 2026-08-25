import fs from 'fs'
import path from 'path'
import express from 'express'
import passport from 'passport'
import yaml from 'yaml'
import { httpRequestLogging } from './adapters/adapters.logging.http'
import AuthenticationInitializer from './authentication'
import provision from './provision'
import env = require('./environment/env')
import log from './logger'

const app = express();
app.use(function(req, res, next) {
  req.getRoot = function(): string {
    return req.protocol + '://' + req.get('host');
  };

  req.getPath = function(): string {
    return req.getRoot() + req.path;
  };

  if (process.env.MAGE_HTTP_DEBUG === 'true') {
    console.debug(
      `[HTTP REQUEST] ${req.method} ${req.getPath()}\n`,
      req.rawHeaders
    );
  }

  return next();
});

app.enable('trust proxy');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

const jsonOptions = { limit: '16mb', strict: false };
app.use(
  express.json(jsonOptions),
  express.urlencoded({ ...jsonOptions, extended: true })
);

app.use(passport.initialize());

app.use(httpRequestLogging(log.child({ component: 'http' }), env.httpRequestLogMethods));
app.get('/api/docs/openapi.yaml', async function(req, res) {
  const docPath = path.resolve(__dirname, 'docs', 'openapi.yaml');
  fs.readFile(docPath, (err, contents) => {
    const doc = yaml.parse(contents.toString('utf-8'));
    doc.servers = [{ url: req.getRoot() }];
    res.contentType('text/yaml; charset=utf-8').send(yaml.stringify(doc));
  });
});
app.use('/api/docs', express.static(path.join(__dirname, 'docs')));

// Configure authentication
const auth = AuthenticationInitializer.initialize(
  app,
  passport,
  provision
);

app.use(
  '/private',
  auth.bearerAuthentication,
  express.static(path.join(__dirname, 'private'))
);

// Configure routes
// TODO: don't pass authentication to other routes, but enforce authentication ahead of adding route modules
import initializeRoutes = require('./routes')
initializeRoutes(app, { authentication: auth });

// Express requires a 4 parameter function callback, do not remove unused next parameter
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(function(err, req, res, next) {
  log.error(`unhandled error during request:' ${req.method}: ${req.path} %s`, err);
  const status = err.status || 500;
  let msg = status === 500
      ? 'Internal server error, please contact MAGE administrator.'
      : err.message;
  if (err.name === 'ValidationError') {
    msg = {
      message: err.message,
      errors: err.errors
    };
    return res.status(400).json(msg);
  }
  res.status(status).send(msg);
} as express.ErrorRequestHandler);

export { app, auth }
