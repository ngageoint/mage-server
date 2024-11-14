import passport from 'passport'
import express from 'express'
import { Strategy as LocalStrategy, VerifyFunction as LocalStrategyVerifyFunction } from 'passport-local'
import { LocalIdpAccount } from './local-idp.entities'
import { IdentityProviderUser } from './ingress.entities'
import { LocalIdpAuthenticateOperation } from './local-idp.app.api'
import { IngressProtocolWebBinding, IngressResponseType } from './ingress.protocol.bindings'


function userForLocalIdpAccount(account: LocalIdpAccount): IdentityProviderUser {
  return {
    username: account.username,
    displayName: account.username,
    phones: [],
  }
}

function createLocalStrategy(localIdpAuthenticate: LocalIdpAuthenticateOperation, flowState: string | undefined): passport.Strategy {
  const verify: LocalStrategyVerifyFunction = async function LocalIngressProtocolVerify(username, password, done) {
    const authResult = await localIdpAuthenticate({ username, password })
    if (authResult.success) {
      const localAccount = authResult.success
      const localIdpUser = userForLocalIdpAccount(localAccount)
      return done(null, { admittingFromIdentityProvider: { idpName: 'local', account: localIdpUser, flowState } })
    }
    return done(authResult.error)
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

export function createWebBinding(passport: passport.Authenticator, localIdpAuthenticate: LocalIdpAuthenticateOperation): IngressProtocolWebBinding {
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
