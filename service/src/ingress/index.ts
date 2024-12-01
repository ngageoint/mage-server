import crypto from 'crypto'
import { JWTService, Payload, TokenAssertion } from './verification'
import express from 'express'
import passport from 'passport'
import provision, { ProvisionStatic } from '../provision'
import { User, UserRepository } from '../entities/users/entities.users'
import bearer from 'passport-http-bearer'
import { UserDocument } from '../adapters/users/adapters.users.db.mongoose'
import { SessionRepository } from './ingress.entities'
const api = require('../api/')
const config = require('../config.js')
const log = require('../logger')
const userTransformer = require('../transformers/user')
const authenticationApiAppender = require('../utilities/authenticationApiAppender')
const AuthenticationConfiguration = require('../models/authenticationconfiguration')
const SecurePropertyAppender = require('../security/utilities/secure-property-appender');

/**
 * TODO: users-next: this module should go away. this remains for now as a reference to migrate legacy logic to new architecture
 */

export class AuthenticationInitializer {
  static tokenService = new JWTService(crypto.randomBytes(64).toString('hex'), 'urn:mage');
  static app: express.Application
  static passport: passport.Authenticator;
  static provision: provision.ProvisionStatic;

  static initialize(app: express.Application, passport: passport.Authenticator, provision: provision.ProvisionStatic): { passport: passport.Authenticator } {
    AuthenticationInitializer.app = app;
    AuthenticationInitializer.passport = passport;
    AuthenticationInitializer.provision = provision;

    passport.serializeUser(function (user, done) {
      done(null, user._id);
    });

    passport.deserializeUser(function (id, done) {
      // TODO: users-next
      User.getUserById(id, function (err, user) {
        done(err, user);
      });
    });

    passport.use('authorization', new BearerStrategy(function (token, done) {
      const expectation = {
        assertion: TokenAssertion.Authenticated
      };

      AuthenticationInitializer.tokenService.verifyToken(token, expectation)
        .then(payload => {
          // TODO: users-next
          User.getUserById(payload.subject)
            .then(user => done(null, user))
            .catch(err => done(err));
        })
        .catch(err => done(err));
    }));

    function authorize(req: express.Request, res: express.Response, next: express.NextFunction): any {
      passport.authenticate('authorization', function (err: Error, user: User, info: any = {}) {
        if (!user) {
          return res.status(401).send(info.message)
        }
        req.user = user
        next()
      })(req, res, next)
    }

    function provisionDevice(req: express.Request, res: express.Response, next: express.NextFunction): any {
      provision.check(req.user.authentication.authenticationConfiguration.type, req.user.authentication.authenticationConfiguration.name)(req, res, next);
    }

    app.post('/auth/token',
      authorize,
      provisionDevice,
      function (req, res, next) {
        const options = {
          userAgent: req.headers['user-agent'],
          appVersion: req.param('appVersion')
        };
        // TODO: users-next
        new api.User().login(req.user, req.provisionedDevice, options, function (err, session) {
          if (err) return next(err);

          authenticationApiAppender.append(config.api).then(api => {
            res.json({
              token: session.token,
              expirationDate: session.expirationDate,
              user: userTransformer.transform(req.user, { path: req.getRoot() }),
              device: req.provisionedDevice,
              api: api
            });
          }).catch(err => {
            next(err);
          });
        });

        req.session = null;
      }
    );

    AuthenticationConfiguration.getAllConfigurations().then(configs => {
      configs.forEach(config => {
        const strategy = require('../authentication/' + config.type);
        SecurePropertyAppender.appendToConfig(config).then(appendedConfig => {
          strategy.initialize(appendedConfig);
        }).catch(err => {
          log.error(err);
        });
      });
    }).catch(err => {
      log.warn(err);
    });

    //TODO due to a timing issue on startup, local may not yet be configured during setup phase
    //For now, always load it (even though it may have already be loaded above)
    require('./local').initialize();
    require('./anonymous').initialize();

    return { passport }
  }
}
