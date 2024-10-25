import express from 'express'
import svgCaptcha from 'svg-captcha'
import { Authenticator } from 'passport'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import { defaultHashUtil } from '../utilities/password-hashing'
import { JWTService, Payload, TokenVerificationError, VerificationErrorReason, TokenAssertion } from './verification'
import { invalidInput, InvalidInputError, MageError } from '../app.api/app.api.errors'
import { IdentityProviderRepository } from './ingress.entities'
import { AdmitFromIdentityProviderOperation, EnrollMyselfOperation, EnrollMyselfRequest } from './ingress.app.api'
import { IngressProtocolWebBinding } from './ingress.protocol.bindings'

declare module 'express-serve-static-core' {
  interface Request {
    ingress?: IngressRequestContext
  }
}

type IngressRequestContext = { identityProviderService: IngressProtocolWebBinding } & (
  | { state: 'init' }
  | { state: 'localEnrollment', localEnrollment: LocalEnrollment }
)

type LocalEnrollment =
  | {
    state: 'humanTokenVerified'
    captchaTokenPayload: Payload
  }
  | {
    state: 'humanVerified'
    subject: string
  }

export type IngressOperations = {
  enrollMyself: EnrollMyselfOperation
  admitFromIdentityProvider: AdmitFromIdentityProviderOperation
}

export type IngressRoutes = {
  localEnrollment: express.Router
  idpAdmission: express.Router
}

function bindingFor(idpName: string): IngressProtocolWebBinding {
  throw new Error('unimplemented')
}

export function CreateIngressRoutes(ingressApp: IngressOperations, idpRepo: IdentityProviderRepository, tokenService: JWTService, passport: Authenticator): IngressRoutes {

  const captchaBearer = new BearerStrategy((token, done) => {
    const expectation = {
      subject: null,
      expiration: null,
      assertion: TokenAssertion.IsHuman
    }
    tokenService.verifyToken(token, expectation)
      .then(payload => done(null, payload))
      .catch(err => done(err))
  })

  // TODO: separate routers for /auth/idp/* and /api/users/signups/* for backward compatibility

  const routeToIdp = express.Router().all('/',
    ((req, res, next) => {
      const idpService = req.ingress?.identityProviderService
      if (idpService) {
        return idpService.handleRequest(req, res, next)
      }
      next(new Error(`no identity provider for ingress request: ${req.method} ${req.originalUrl}`))
    }) as express.RequestHandler,
    (async (err, req, res, next) => {
      if (err) {
        console.error('identity provider authentication error:', err)
        return res.status(500).send('unexpected authentication result')
      }
      if (req.user?.from !== 'identityProvider') {
        console.error('unexpected authentication user type:', req.user?.from)
        return res.status(500).send('unexpected authentication result')
      }
      const identityProviderName = req.ingress!.identityProviderService!.idp.name
      const identityProviderUser = req.user.account
      const admission = await ingressApp.admitFromIdentityProvider({ identityProviderName, identityProviderUser })
      if (admission.error) {
        return next(admission.error)
      }
      const { admissionToken, mageAccount } = admission.success
      /*
      TODO: copied from redirecting protocols - cleanup and adapt here
      local/ldap use direct json response
      saml uses RelayState body property
      oauth/oidc use state query parameter
      can all use direct json response and handle redirect windows client side?
      */
      if (req.query.state === 'mobile') {
        let uri;
        if (!mageAccount.active || !mageAccount.enabled) {
          uri = `mage://app/invalid_account?active=${mageAccount.active}&enabled=${mageAccount.enabled}`;
        } else {
          uri = `mage://app/authentication?token=${req.token}`
        }
        res.redirect(uri);
      } else {
        res.render('authentication', { host: req.getRoot(), success: true, login: { token: req.token, user: req.user } });
      }
    }) as express.ErrorRequestHandler
  )

  // TODO: mount to /auth
  const idpAdmission = express.Router()
  idpAdmission.use('/:identityProviderName',
    (req, res, next) => {
      const idpName = req.params.identityProviderName
      const idpService = bindingFor(idpName)
      if (idpService) {
        req.ingress = { state: 'init', identityProviderService: idpService }
        return next()
      }
      res.status(404).send(`${idpName} not found`)
    },
    // use a sub-router so express implicitly strips the base url /auth/:identityProviderName before routing idp handler
    routeToIdp
  )

  // TODO: mount to /api/users/signups
  const localEnrollment = express.Router()
  localEnrollment.route('/signups')
    .post(async (req, res, next) => {
      try {
        const username = typeof req.body.username === 'string' ? req.body.username.trim() : null
        if (!username) {
          return res.status(400).send('Invalid signup - username is required.')
        }
        const background = typeof req.body.background === 'string' ? req.body.background.toLowerCase() : '#ffffff'
        const captcha = svgCaptcha.create({
          size: 6,
          noise: 4,
          color: false,
          background: background !== '#ffffff' ? background : null
        })
        const captchaHash = await defaultHashUtil.hashPassword(captcha.text)
        const claims = { captcha: captchaHash }
        const verificationToken = await tokenService.generateToken(username, TokenAssertion.IsHuman, 60 * 3, claims)
        res.json({
          token: verificationToken,
          captcha: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`
        })
      }
      catch (err) {
        next(err)
      }
    })

  // TODO: mount to /api/users/signups/verifications
  localEnrollment.route('/signups/verifications')
    .post(
      async (req, res, next) => {
        passport.authenticate(captchaBearer, (err: TokenVerificationError, captchaTokenPayload: Payload) => {
          if (err) {
            if (err.reason === VerificationErrorReason.Expired) {
              return res.status(401).send('Captcha timeout')
            }
            return res.status(400).send('Invalid captcha. Please try again.')
          }
          if (!captchaTokenPayload) {
            return res.status(400).send('Missing captcha token')
          }
          req.ingress = {
            ...req.ingress!,
            state: 'localEnrollment',
            localEnrollment: { state: 'humanTokenVerified', captchaTokenPayload } }
          next()
        })(req, res, next)
      },
      async (req, res, next) => {
        try {
          if (req.ingress?.state !== 'localEnrollment' || req.ingress.localEnrollment.state !== 'humanTokenVerified') {
            return res.status(500).send('invalid ingress state')
          }
          const tokenPayload = req.ingress.localEnrollment.captchaTokenPayload
          const hashedCaptchaText = tokenPayload.captcha as string
          const userCaptchaText = req.body.captchaText
          const isHuman = await defaultHashUtil.validPassword(userCaptchaText, hashedCaptchaText)
          if (!isHuman) {
            return res.status(403).send('Invalid captcha. Please try again.')
          }
          const username = tokenPayload.subject!
          const parsedEnrollment = validateEnrollment(req.body)
          if (parsedEnrollment instanceof MageError) {
            return next(parsedEnrollment)
          }
          const enrollment: EnrollMyselfRequest = {
            ...parsedEnrollment,
            username
          }
          const appRes = await ingressApp.enrollMyself(enrollment)
          if (appRes.success) {
            return res.json(appRes.success)
          }
          next(appRes.error)
        }
        catch (err) {
          next(err)
        }
      }
    )

  return { localEnrollment, idpAdmission }
}

function validateEnrollment(input: any): Omit<EnrollMyselfRequest, 'username'> | InvalidInputError {
  const { displayName, email, password, phone } = input
  if (typeof displayName !== 'string') {
    return invalidInput('displayName is required')
  }
  if (typeof password !== 'string') {
    return invalidInput('password is required')
  }
  const enrollment: Omit<EnrollMyselfRequest, 'username'> = { displayName, password }
  if (email && typeof email === 'string') {
    if (!/^[^\s@]+@[^\s@]+\./.test(email)) {
      return invalidInput('email is invalid')
    }
    enrollment.email = email
  }
  if (phone && typeof phone === 'string') {
    enrollment.phone = phone
  }
  return enrollment
}