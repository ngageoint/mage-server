import express from 'express'
import { InternalOAuthError, Strategy as OAuth2Strategy, StrategyOptions as OAuth2Options, VerifyCallback, VerifyFunction } from 'passport-oauth2'
import base64 from 'base-64'
import { IdentityProvider, IdentityProviderUser } from './ingress.entities'
import { Authenticator } from 'passport'
import { IngressProtocolWebBinding, IngressResponseType } from './ingress.protocol.bindings'

export type OAuth2ProtocolSettings =
  Pick<OAuth2Options,
  | 'clientID'
  | 'clientSecret'
  | 'authorizationURL'
  | 'tokenURL'
  | 'scope'
  | 'pkce'
  > &
  {
    profileURL: string,
    headers?: { basic?: boolean | null | undefined },
    profile: OAuth2ProfileKeys
  }

export type OAuth2ProfileKeys = {
  id: string
  email: string
  displayName: string
}

function copyProtocolSettings(from: OAuth2ProtocolSettings): OAuth2ProtocolSettings {
  const copy = { ...from }
  copy.profile = { ...from.profile }
  if (Array.isArray(from.scope)) {
    copy.scope = [ ...from.scope ]
  }
  if (from.headers) {
    copy.headers = { ...from.headers }
  }
  return copy
}

class OAuth2ProfileStrategy extends OAuth2Strategy {

  constructor(options: OAuth2Options, readonly profileURL: string, verify: VerifyFunction) {
    super(options as OAuth2Options, verify)
    this._oauth2.useAuthorizationHeaderforGET(true)
  }

  userProfile(accessToken: string, done: (err: unknown, profile?: any) => void): void {
    this._oauth2.get(this.profileURL, accessToken, (err, body) => {
      if (err) {
        return done(new InternalOAuthError('error fetching oauth2 user profile', err))
      }
      try {
        const parsedBody = JSON.parse(body as string)
        const profile = {
          provider: 'oauth2',
          json: parsedBody,
          raw: body,
        }
        done(null, profile)
      }
      catch (err) {
        console.error('error parsing oauth profile', err)
        done(err)
      }
    })
  }
}

function applyDefaultProtocolSettings(idp: IdentityProvider): OAuth2ProtocolSettings {
  const settings = copyProtocolSettings(idp.protocolSettings as OAuth2ProtocolSettings)
  const profile = settings.profile
  if (!profile.displayName) {
    profile.displayName = 'displayName'
  }
  if (!profile.email) {
    profile.email = 'email'
  }
  if (!profile.id) {
    profile.id = 'id';
  }
  return settings
}

type OAuth2Info = { state: string }

/**
 * The `baseUrl` parameter is the URL at which Mage will mount the returned `express.Router`, including any
 * distinguishing component of the given `IdentityProvider`, without a trailing slash, e.g. `/auth/example-idp`.
 */
export function createOAuthProtocolWebBinding(idp: IdentityProvider, passport: Authenticator, baseUrl: string): IngressProtocolWebBinding {
  const settings = applyDefaultProtocolSettings(idp)
  const profileURL = settings.profileURL
  const customHeaders = settings.headers?.basic ? {
    authorization: `Basic ${base64.encode(`${settings.clientID}:${settings.clientSecret}`)}`
  } : undefined
  const strategyOptions: OAuth2Options = {
    clientID: settings.clientID,
    clientSecret: settings.clientSecret,
    callbackURL: `${baseUrl}/callback`,
    authorizationURL: settings.authorizationURL,
    tokenURL: settings.tokenURL,
    customHeaders,
    scope: settings.scope,
    pkce: settings.pkce,
    /**
     * cast to `any` because `@types/passport-oauth2` incorrectly does not allow `boolean` for the `store` entry
     * https://github.com/jaredhanson/passport-oauth2/blob/master/lib/strategy.js#L107
     */
    store: true as any
  }
  const verify: VerifyFunction = (accessToken: string, refreshToken: string, profileResponse: any, done: VerifyCallback) => {
    const profile = profileResponse.json
    const profileKeys = settings.profile
    if (!profile[profileKeys.id]) {
      console.error(`oauth2 profile missing id for key ${profileKeys.id}:\n`, JSON.stringify(profile, null, 2))
      return done(new Error(`oauth2 user profile does not contain id property ${profileKeys.id}`))
    }
    const username = profile[profileKeys.id]
    const displayName = profile[profileKeys.displayName] || username
    const email = profile[profileKeys.email]
    const idpUser: IdentityProviderUser = { username, displayName, email, phones: [] }
    return done(null, { admittingFromIdentityProvider: { idpName: idp.name, account: idpUser, flowState: '' }})
  }
  const oauth2Strategy = new OAuth2ProfileStrategy(strategyOptions, profileURL, verify)
  const handleIngressFlowRequest = express.Router()
    .get('/callback', (req, res, next) => {
      const finishIngressFlow = passport.authenticate(
        oauth2Strategy,
        (err: Error | null | undefined, account: IdentityProviderUser, info: OAuth2Info) => {
          if (err) {
            return next(err)
          }
          req.user = { admittingFromIdentityProvider: { idpName: idp.name, account, flowState: info.state }}
          next()
        }
      )
      finishIngressFlow(req, res, next)
    })
  return {
    ingressResponseType: IngressResponseType.Redirect,
    beginIngressFlow(req, res, next, flowState): any {
      passport.authenticate(oauth2Strategy, { state: flowState })(req, res, next)
    },
    handleIngressFlowRequest
  }
}