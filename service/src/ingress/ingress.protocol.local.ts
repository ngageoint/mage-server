import passport from 'passport'
import express from 'express'
import { Strategy as LocalStrategy, VerifyFunction as LocalStrategyVerifyFunction } from 'passport-local'
import { LocalIdpAccount } from './local-idp.entities'
import { IdentityProviderUser } from './ingress.entities'
import { IngressProtocolWebBinding, IngressResponseType } from './ingress.protocol.bindings'
import { MageLocalIdentityProviderService } from './local-idp.services.api'
import { permissionDenied } from '../app.api/app.api.errors'


function userForLocalIdpAccount(account: LocalIdpAccount): IdentityProviderUser {
  return {
    username: account.username,
    displayName: account.username,
    phones: [],
  }
}

function createLocalStrategy(localIdp: MageLocalIdentityProviderService, flowState: string | undefined): passport.Strategy {
  const verify: LocalStrategyVerifyFunction = async function LocalIngressProtocolVerify(username, password, done) {
    const authResult = await localIdp.authenticate({ username, password })
    if (!authResult || authResult.failed) {
      return done(permissionDenied('local authentication failed', username))
    }
    const localAccount = authResult.authenticated
    const localIdpUser = userForLocalIdpAccount(localAccount)
    return done(null, { admittingFromIdentityProvider: { idpName: 'local', account: localIdpUser, flowState } })
  }
  return new LocalStrategy(verify)
}

const validateSigninRequest: express.RequestHandler = function LocalProtocolIngressHandler(req, res, next) {
  if (req.method !== 'POST' || !req.body) {
    return res.status(400).send(`invalid request method ${req.method}`)
  }
  const username = req.body.username
  const password = req.body.password
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).send(`username and password are required`)
  }
  next()
}

export function createLocalProtocolWebBinding(passport: passport.Authenticator, localIdpAuthenticate: MageLocalIdentityProviderService): IngressProtocolWebBinding {
  return {
    ingressResponseType: IngressResponseType.Direct,
    beginIngressFlow: (req, res, next, flowState): any => {
      const authStrategy = createLocalStrategy(localIdpAuthenticate, flowState)
      const applyLocalProtocol = express.Router()
        .post('/*',
          express.urlencoded(),
          validateSigninRequest,
          passport.authenticate(authStrategy)
        )
      applyLocalProtocol(req, res, next)
    },
    handleIngressFlowRequest(req, res): any {
      return res.status(400).send('invalid local ingress request')
    }
  }
}
