import express from 'express'
import svgCaptcha from 'svg-captcha'
import { Authenticator } from 'passport'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import { defaultHashUtil } from '../utilities/password-hashing'
import { JWTService, Payload, TokenVerificationError, VerificationErrorReason } from './verification'
import { invalidInput, InvalidInputError, MageError } from '../app.api/app.api.errors'
import { IdentityProviderRepository } from './ingress.entities'
import { AdmitFromIdentityProviderOperation, EnrollMyselfOperation, EnrollMyselfRequest } from './ingress.app.api'
import { IngressProtocolWebBinding } from './ingress.protocol.bindings'

declare module 'express-serve-static-core' {
  interface Request {
    identityProviderService?: IngressProtocolWebBinding
  }
}

export type IngressOperations = {
  enrollMyself: EnrollMyselfOperation
  admitFromIdentityProvider: AdmitFromIdentityProviderOperation
}

function bindingFor(idpName: string): IngressProtocolWebBinding {
  throw new Error('unimplemented')
}

export function CreateIngressRoutes(ingressApp: IngressOperations, idpRepo: IdentityProviderRepository, tokenService: JWTService, passport: Authenticator): express.Router {

  const captchaBearer = new BearerStrategy((token, done) => {
    const expectation = {
      subject: null,
      expiration: null,
      assertion: TokenAssertion.Captcha
    }
    tokenService.verifyToken(token, expectation)
      .then(payload => done(null, payload))
      .catch(err => done(err))
  })

  const routes = express.Router()

  // TODO: signup
  // TODO: signin

  const routeToIdp = express.Router().all('/',
    ((req, res, next) => {
      const idpService = req.identityProviderService!
      idpService.handleRequest(req, res, next)
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
      const identityProviderName = req.identityProviderService!.idp.name
      const identityProviderUser = req.user.account
      const ingressResult = await ingressApp.admitFromIdentityProvider({ identityProviderName, identityProviderUser })
      if (ingressResult.error) {
        next(ingressResult.error)
      }
      // if user active and enabled, send authenticated JWT and proceed to verification
      // else
      const account = ingressResult.success!

    }) as express.ErrorRequestHandler
  )

  routes.use('/:identityProviderName',
    (req, res, next) => {
      const idpName = req.params.identityProviderName
      const idpService = bindingFor(idpName)
      if (idpService) {
        req.identityProviderService = idpService
        return next()
      }
      res.status(404).send(`${idpName} not found`)
    },
    routeToIdp
  )

  // TODO: mount to /api/users/signups
  routes.route('/signups')
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
        const verificationToken = await tokenService.generateToken(username, TokenAssertion.Captcha, 60 * 3, claims)
        res.json({
          token: verificationToken,
          captcha: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`
        })
      }
      catch (err) {
        next(err)
      }
    })

  routes.route('/signups/verifications')
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
          req.user = captchaTokenPayload
          next()
        })(req, res, next)
      },
      async (req, res, next) => {
        try {
          const isHuman = await defaultHashUtil.validPassword(req.body.captchaText, req.user.captcha)
          if (!isHuman) {
            return res.status(403).send('Invalid captcha. Please try again.')
          }
          const payload = req.user as Payload
          const username = payload.subject!
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

  return routes
}

function validateEnrollment(input: any): Omit<EnrollMyselfRequest, 'username'> | InvalidInputError {
  const { displayName, email, password, phone } = input
  if (!displayName) {
    return invalidInput('displayName is required')
  }
  if (!password) {
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