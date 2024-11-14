import express from 'express'
import svgCaptcha from 'svg-captcha'
import { Authenticator } from 'passport'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import { defaultHashUtil } from '../utilities/password-hashing'
import { JWTService, Payload, TokenVerificationError, VerificationErrorReason, TokenAssertion } from './verification'
import { invalidInput, InvalidInputError, MageError, permissionDenied } from '../app.api/app.api.errors'
import { IdentityProvider, IdentityProviderRepository } from './ingress.entities'
import { AdmitFromIdentityProviderOperation, EnrollMyselfOperation, EnrollMyselfRequest } from './ingress.app.api'
import { IngressProtocolWebBinding, IngressResponseType } from './ingress.protocol.bindings'
import { createWebBinding as LocalBinding } from './ingress.protocol.local'
import { createWebBinding as OAuthBinding } from './ingress.protocol.oauth'

declare module 'express-serve-static-core' {
  interface Request {
    ingress?: IngressRequestContext
    localEnrollment?: LocalEnrollmentContext
  }
}

enum UserAgentType {
  MobileApp = 'MobileApp',
  WebApp = 'WebApp'
}

type IngressRequestContext = {
  idp: IdentityProvider
  idpBinding: IngressProtocolWebBinding
}

type LocalEnrollmentContext =
  | {
    state: 'humanTokenVerified'
    captchaTokenPayload: Payload
  }
  | {
    state: 'humanVerified'
    subject: string
  }

export type IngressUseCases = {
  enrollMyself: EnrollMyselfOperation
  admitFromIdentityProvider: AdmitFromIdentityProviderOperation
}

export type IngressRoutes = {
  localEnrollment: express.Router
  idpAdmission: express.Router
}

export function CreateIngressRoutes(ingressApp: IngressUseCases, idpRepo: IdentityProviderRepository, tokenService: JWTService, passport: Authenticator): IngressRoutes {

  const idpBindings = new Map<string, IngressProtocolWebBinding>()
  async function bindingFor(idpName: string): Promise<IngressProtocolWebBinding | null> {
    const idp = await idpRepo.findIdpByName(idpName)
    if (!idp) {
      return null
    }
    if (idp.protocol === 'local') {
      return LocalBinding(passport, )
    }
    throw new Error('unimplemented')
  }

  const routeToIdp = express.Router()
    .all('/',
      ((req, res, next) => {
        const idpService = req.ingress?.idpBinding
        if (!idpService) {
          return next(new Error(`no identity provider for ingress request: ${req.method} ${req.originalUrl}`))
        }
        if (req.path.endsWith('/signin')) {
          const userAgentType: UserAgentType = req.params.state === 'mobile' ? UserAgentType.MobileApp : UserAgentType.WebApp
          return idpService.beginIngressFlow(req, res, next, userAgentType)
        }
        idpService.handleIngressFlowRequest(req, res, next)
      }) as express.RequestHandler,
      (async (err, req, res, next) => {
        if (err) {
          console.error('identity provider authentication error:', err)
          return res.status(500).send('unexpected authentication result')
        }
        if (!req.user?.admittingFromIdentityProvider) {
          console.error('unexpected ingress user type:', req.user)
          return res.status(500).send('unexpected authentication result')
        }
        const idpAdmission = req.user.admittingFromIdentityProvider
        const { idpBinding, idp } = req.ingress!
        const identityProviderUser = idpAdmission.account
        const admission = await ingressApp.admitFromIdentityProvider({ identityProviderName: idp.name, identityProviderUser })
        if (admission.error) {
          return next(admission.error)
        }
        const { admissionToken, mageAccount } = admission.success
        if (idpBinding.ingressResponseType === IngressResponseType.Direct) {
          return res.json({ user: mageAccount, token: admissionToken })
        }
        if (idpAdmission.flowState === UserAgentType.MobileApp) {
          if (mageAccount.active && mageAccount.enabled) {
            return res.redirect(`mage://app/authentication?token=${req.token}`)
          }
          else {
            return res.redirect(`mage://app/invalid_account?active=${mageAccount.active}&enabled=${mageAccount.enabled}`)
          }
        }
        else if (idpAdmission.flowState === UserAgentType.WebApp) {
          return res.render('authentication', { host: req.getRoot(), success: true, login: { token: admissionToken, user: mageAccount } })
        }
        return res.status(500).send('invalid authentication state')
      }) as express.ErrorRequestHandler
    )

  // TODO: mount to /auth
  const idpAdmission = express.Router()
  idpAdmission.use('/:identityProviderName',
    async (req, res, next) => {
      const idpName = req.params.identityProviderName
      const idp = await idpRepo.findIdpByName(idpName)
      const idpBinding = await bindingFor(idpName)
      if (idpBinding && idp) {
        req.ingress = { idpBinding, idp }
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
          req.localEnrollment = { state: 'humanTokenVerified', captchaTokenPayload }
          next()
        })(req, res, next)
      },
      async (req, res, next) => {
        try {
          if (req.localEnrollment?.state !== 'humanTokenVerified') {
            return res.status(500).send('invalid ingress state')
          }
          const tokenPayload = req.localEnrollment.captchaTokenPayload
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