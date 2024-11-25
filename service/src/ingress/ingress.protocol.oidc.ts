import express from 'express'
import passport from 'passport'
import OpenIdConnectStrategy from 'passport-openidconnect'
import { IdentityProvider, IdentityProviderUser } from './ingress.entities'
import { IdentityProviderAdmissionWebUser, IngressProtocolWebBinding, IngressResponseType } from './ingress.protocol.bindings'


export type OpenIdConnectProtocolSettings =
  Pick<
    OpenIdConnectStrategy.StrategyOptions,
    'clientID' | 'clientSecret' | 'issuer' | 'authorizationURL' | 'tokenURL' | 'scope'
  > &
  {
    profileURL: string,
    profile: {
      displayName?: string
      email?: string
      id?: string
    }
  }

function copyProtocolSettings(from: OpenIdConnectProtocolSettings): OpenIdConnectProtocolSettings {
  const copy = { ...from }
  copy.profile = { ...from.profile }
  if (Array.isArray(from.scope)) {
    copy.scope = [ ...from.scope ]
  }
  return copy
}

function applyDefaultProtocolSettings(idp: IdentityProvider): OpenIdConnectProtocolSettings {
  const settings = copyProtocolSettings(idp.protocolSettings as OpenIdConnectProtocolSettings)
  if (!settings.scope) {
    settings.scope = [ 'openid' ]
  }
  else if (Array.isArray(settings.scope) && !settings.scope.includes('openid')) {
    settings.scope = [ ...settings.scope, 'openid' ]
  }
  else if (typeof settings.scope === 'string' && settings.scope !== 'openid') {
    settings.scope = [ settings.scope, 'openid' ]
  }
  const profile = settings.profile
  if (!profile.displayName) {
    profile.displayName = 'displayName'
  }
  if (!profile.email) {
    profile.email = 'email'
  }
  if (!profile.id) {
    profile.id = 'sub';
  }
  return settings
}

export function createOIDCProtocolWebBinding(idp: IdentityProvider, passport: passport.Authenticator, baseUrl: string): IngressProtocolWebBinding {
  const settings = applyDefaultProtocolSettings(idp)
  const verify: OpenIdConnectStrategy.VerifyFunction = (
    issuer: string,
    uiProfile: any,
    idProfile: object,
    context: object,
    idToken: string | object,
    accessToken: string | object,
    refreshToken: string,
    params: any,
    done: OpenIdConnectStrategy.VerifyCallback
  ) => {
    const jsonProfile = uiProfile._json
    const idpAccountId = jsonProfile[settings.profile.id!]
    if (!idpAccountId) {
      const message = `user profile from oidc identity provider ${idp.name} does not contain id property ${settings.profile.id}`
      console.error(message, JSON.stringify(jsonProfile, null, 2))
      return done(new Error(message))
    }
    const idpUser: IdentityProviderUser = {
      username: idpAccountId,
      displayName: jsonProfile[settings.profile.displayName!] || idpAccountId,
      email: jsonProfile[settings.profile.email!],
      phones: [],
      idpAccountId
    }
    done(null, { admittingFromIdentityProvider: { idpName: idp.name, account: idpUser } } )
  }
  const oidcStrategy = new OpenIdConnectStrategy(
    {
      clientID: settings.clientID,
      clientSecret: settings.clientSecret,
      issuer: settings.issuer,
      authorizationURL: settings.authorizationURL,
      tokenURL: settings.tokenURL,
      userInfoURL: settings.profileURL,
      callbackURL: `${baseUrl}/callback`,
      scope: settings.scope
    },
    verify
  )
  const handleIngressFlowRequest = express.Router()
    .get('/callback', (req, res, next) => {
      const finishIngressFlow = passport.authenticate(
        oidcStrategy,
        (err: Error | null, user: IdentityProviderAdmissionWebUser, info: { state: string | undefined }) => {
          if (err) {
            return next(err)
          }
          const idpUserWithState: IdentityProviderAdmissionWebUser = {
            ...user,
            flowState: info.state
          }
          req.user = { admittingFromIdentityProvider: idpUserWithState }
          next()
        }
      )
      finishIngressFlow(req, res, next)
    })
  return {
    ingressResponseType: IngressResponseType.Redirect,
    beginIngressFlow(req, res, next, flowState): any {
      passport.authenticate(oidcStrategy, { state: flowState })(req, res, next)
    },
    handleIngressFlowRequest
  }
}
