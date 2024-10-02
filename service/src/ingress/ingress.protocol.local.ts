import passport from 'passport'
import express from 'express'
import { Strategy as LocalStrategy, VerifyFunction as LocalStrategyVerifyFunction } from 'passport-local'
import { LocalIdpAccount } from './local-idp.entities'
import { IdentityProviderUser } from './ingress.entities'
import { LocalIdpAuthenticateOperation } from './local-idp.app.api'


function userForLocalIdpAccount(account: LocalIdpAccount): IdentityProviderUser {
  return {
    username: account.username,
    displayName: account.username,
    phones: [],
  }
}

function createProtocolMiddleware(localIdpAuthenticate: LocalIdpAuthenticateOperation): passport.Strategy {
  const verify: LocalStrategyVerifyFunction = async function LocalIngressProtocolVerify(username, password, done) {
    const authResult = await localIdpAuthenticate({ username, password })
    if (authResult.success) {
      const localAccount = authResult.success
      const localIdpUser = userForLocalIdpAccount(localAccount)
      return done(null, { from: 'identityProvider', account: localIdpUser })
    }
    return done(authResult.error)
  }
  return new LocalStrategy(verify)
}

const validateRequest: express.RequestHandler = function LocalProtocolIngressHandler(req, res, next) {
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

export function createIngressStack(passport: passport.Authenticator, localIdpAuthenticate: LocalIdpAuthenticateOperation): express.RequestHandler[] {
  const authStrategy = createProtocolMiddleware(localIdpAuthenticate)
  const authHandler: express.RequestHandler = async (req, res, next) => {
    passport.authenticate(authStrategy)(req, res, next)
  }
  return [
    express.urlencoded(),
    validateRequest,
    authHandler,
  ]
}
