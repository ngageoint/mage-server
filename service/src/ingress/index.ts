import crypto from 'crypto'
import { JWTService, Payload, TokenAssertion } from './verification'
import express from 'express'
import passport from 'passport'
import provision, { ProvisionStatic } from '../provision'
import { User, UserRepository } from '../entities/users/entities.users'
import bearer from 'passport-http-bearer'
import { UserDocument } from '../adapters/users/adapters.users.db.mongoose'
import { SessionRepository } from './entities.authentication'
const api = require('../api/')
const config = require('../config.js')
const log = require('../logger')
const userTransformer = require('../transformers/user')
const authenticationApiAppender = require('../utilities/authenticationApiAppender')
const AuthenticationConfiguration = require('../models/authenticationconfiguration')
const SecurePropertyAppender = require('../security/utilities/secure-property-appender');



export async function initializeAuthenticationStack(
  userRepo: UserRepository,
  sessionRepo: SessionRepository,
  verificationService: JWTService,
  provisioning: provision.ProvisionStatic,
  passport: passport.Authenticator,
): Promise<express.Router> {
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userRepo.findById(String(id))
      done(null, user)
    }
    catch (err) {
      done(err)
    }
  })
  registerAuthenticatedBearerTokenHandling(passport, sessionRepo, userRepo)
  registerIdpAuthenticationVerification(passport, verificationService, userRepo)
  const routes = express.Router()
  registerTokenGenerationEndpointWithDeviceVerification(routes, passport)
}

const VerifyIdpAuthenticationToken = 'verifyIdpAuthenticationToken'

function registerAuthenticatedBearerTokenHandling(passport: passport.Authenticator, sessionRepo: SessionRepository, userRepo: UserRepository): passport.Authenticator {
  return passport.use(
    /*
    This is the default bearer token authentication, registered to the passport instance under the default `bearer`
    name.
    */
    new bearer.Strategy(
      { passReqToCallback: true },
      async function (req: express.Request, token: string, done: (err: Error | null, user?: User, access?: bearer.IVerifyOptions) => any) {
        try {
          const session = await sessionRepo.findSessionByToken(token)
          if (!session) {
            console.warn('no session for token', token, req.method, req.url)
            return done(null)
          }
          const user = await userRepo.findById(session.user)
          if (!user) {
            console.warn('no user for token', token, 'user id', session.user, req.method, req.url)
            return done(null)
          }
          req.token = session.token
          if (session.device) {
            req.provisionedDeviceId = session.device
          }
          return done(null, user, { scope: 'all' });
        }
        catch (err) {
          return done(err as Error)
        }
      }
    )
  )
}

/**
 * Register a `BearerStrategy` that expects a JWT in the `Authorization` header that contains the
 * {@link TokenAssertion.Authorized} claim.  The claim indicates the subject has authenticated with an IDP and can
 * continue the sign-in process.  Decode and verify the JWT signature, retrieve the `User` for the JWT subject, and set
 * `Request.user`.
 */
function registerIdpAuthenticationVerification(passport: passport.Authenticator, verificationService: JWTService, userRepo: UserRepository): passport.Authenticator {
  passport.use(VerifyIdpAuthenticationToken, new bearer.Strategy(async function(token, done: (error: any, user?: User) => any) {
    try {
      const expectation: Payload = { assertion: TokenAssertion.Authorized, subject: null, expiration: null }
      const payload = await verificationService.verifyToken(token, expectation)
      const user = payload.subject ? await userRepo.findById(payload.subject) : null
      if (user) {
        return done(null, user)
      }
      done(new Error(`user id ${payload.subject} not found for transient token ${String(payload)}`))
    }
    catch (err) {
      done(err)
    }
  }))
  return passport
}

function registerDeviceVerificationAndTokenGenerationEndpoint(routes: express.Router, passport: passport.Authenticator, deviceProvisioning: ProvisionStatic, sessionRepo: SessionRepository) {
  routes.post('/auth/token',
    passport.authenticate(VerifyIdpAuthenticationToken),
    async (req, res, next) => {
      deviceProvisioning.check()
      const options = {
        userAgent: req.headers['user-agent'],
        appVersion: req.body.appVersion
      }
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
}

function registerLocalAuthenticationProtocol(): void {

}


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

    passport.use(
      new bearer.Strategy(
        { passReqToCallback: true },
        async function (req: express.Request, token: string, done: (err: Error | null, user?: UserDocument, access?: bearer.IVerifyOptions) => any) {
          try {
            const session = await lookupSession(token)
            if (!session || !session.user) {
              return done(null)
            }
            req.token = session.token;
            if (session.deviceId) {
              req.provisionedDeviceId = session.deviceId.toHexString();
            }
            return done(null, session.user, { scope: 'all' });
          }
          catch (err) {
            return done(err as Error)
          }
        }
      )
    )

    passport.use('authorization', new BearerStrategy(function (token, done) {
      const expectation = {
        assertion: TokenAssertion.Authorized
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
