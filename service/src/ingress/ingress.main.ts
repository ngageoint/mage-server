import express from 'express'
import passport from 'passport'
import bearer from 'passport-http-bearer'
import { UserRepository } from '../entities/users/entities.users'
import { IngressProtocolWebBindingCache } from './ingress.adapters.controllers.web'
import { IdentityProvider, IdentityProviderRepository, SessionRepository } from './ingress.entities'
import { IngressProtocolWebBinding } from './ingress.protocol.bindings'
import { createLdapProtocolWebBinding } from './ingress.protocol.ldap'
import { createLocalProtocolWebBinding } from './ingress.protocol.local'
import { createOAuthProtocolWebBinding } from './ingress.protocol.oauth'
import { createOIDCProtocolWebBinding } from './ingress.protocol.oidc'
import { createSamlProtocolWebBinding } from './ingress.protocol.saml'
import { MageLocalIdentityProviderService } from './local-idp.services.api'
import { JWTService } from './verification'

export function createIdpCache(idpRepo: IdentityProviderRepository, localIdp: MageLocalIdentityProviderService): IngressProtocolWebBindingCache {
  const bindingsByIdpName = new Map<string, { idp: IdentityProvider, idpBinding: IngressProtocolWebBinding }>()
  const services: BindingServices = {
    passport,
    localIdp,
  }
  async function idpWebBindingForIdpName(idpName: string): Promise<{ idp: IdentityProvider, idpBinding: IngressProtocolWebBinding } | null> {
    const cached = bindingsByIdpName.get(idpName)
    if (cached) {
      return cached
    }
    const idp = await idpRepo.findIdpByName(idpName)
    if (!idp) {
      return null
    }
    const idpBinding = createWebBinding(idp, services)
    const cacheEntry = { idp, idpBinding }
    bindingsByIdpName.set(idp.name, cacheEntry)
    return cacheEntry
  }
  return { idpWebBindingForIdpName }
}

type BindingServices = {
  passport: passport.Authenticator
  localIdp: MageLocalIdentityProviderService
  baseUrl: string
}

function createWebBinding(idp: IdentityProvider, services: BindingServices): IngressProtocolWebBinding {
  if (idp.protocol === 'local') {
    return createLocalProtocolWebBinding(services.passport, services.localIdp)
  }
  if (idp.protocol === 'ldap') {
    return createLdapProtocolWebBinding(idp, services.passport)
  }
  if (idp.protocol === 'oauth') {
    return createOAuthProtocolWebBinding(idp, services.passport, services.baseUrl)
  }
  if (idp.protocol === 'oidc') {
    return createOIDCProtocolWebBinding(idp, services.passport, services.baseUrl)
  }
  if (idp.protocol === 'saml') {
    return createSamlProtocolWebBinding(idp, services.passport, services.baseUrl)
  }
  throw new Error(`cannot create ingress web binding for idp:\n${JSON.stringify(idp, null, 2)}`)
}

export async function initializeIngress(
  userRepo: UserRepository,
  sessionRepo: SessionRepository,
  verificationService: JWTService,
  provisioning: provision.ProvisionStatic,
  passport: passport.Authenticator,
): Promise<express.Router> {
}

/**
 * This is the default bearer token authentication, registered to the passport instance under the default `bearer`
 * name.  Apply session token authentication to routes using Passport's middelware factory as follows.
 * ```
 * expressRoutes.route('/protected')
 *   .use(passport.authenticate('bearer'))
 *   .get((req, res, next) => { ... })
 * ```
 */
function registerAuthenticatedBearerTokenHandling(passport: passport.Authenticator, sessionRepo: SessionRepository, userRepo: UserRepository): passport.Authenticator {
  return passport.use(
    new bearer.Strategy(
      { passReqToCallback: true },
      async function (req: express.Request, token: string, done: (err: Error | null, user?: Express.User, access?: bearer.IVerifyOptions) => any) {
        try {
          const session = await sessionRepo.readSessionByToken(token)
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
          const webUser: Express.User = {
            admitted: {
              account: user,
              session
            }
          }
          return done(null, webUser, { scope: 'all' });
        }
        catch (err) {
          return done(err as Error)
        }
      }
    )
  )
}