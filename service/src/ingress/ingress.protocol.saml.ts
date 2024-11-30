import express from 'express'
import passport from 'passport'
import { SamlConfig, Strategy as SamlStrategy, VerifyWithRequest } from '@node-saml/passport-saml'
import { IdentityProvider, IdentityProviderUser } from './ingress.entities'
import { IngressProtocolWebBinding, IngressResponseType } from './ingress.protocol.bindings'


type SamlProfileKeys = {
  id?: string
  email?: string
  displayName?: string
}

type SamlProtocolSettings =
  Pick<
    SamlConfig,
    | 'path'
    | 'entryPoint'
    | 'cert'
    | 'issuer'
    | 'privateKey'
    | 'decryptionPvk'
    | 'signatureAlgorithm'
    | 'audience'
    | 'identifierFormat'
    | 'acceptedClockSkewMs'
    | 'attributeConsumingServiceIndex'
    | 'disableRequestedAuthnContext'
    | 'authnContext'
    | 'forceAuthn'
    | 'skipRequestCompression'
    | 'authnRequestBinding'
    | 'racComparison'
    | 'providerName'
    | 'idpIssuer'
    | 'validateInResponseTo'
    | 'requestIdExpirationPeriodMs'
    | 'logoutUrl'
  >
  & {
    profile: SamlProfileKeys
  }

function copyProtocolSettings(from: SamlProtocolSettings): SamlProtocolSettings {
  const copy = { ...from }
  copy.profile = { ...from.profile }
  return copy
}

function applyDefaultProtocolSettings(idp: IdentityProvider): SamlProtocolSettings {
  const settings = copyProtocolSettings(idp.protocolSettings as SamlProtocolSettings)
  if (!settings.profile) {
    settings.profile = {}
  }
  if (!settings.profile.displayName) {
    settings.profile.displayName = 'email'
  }
  if (!settings.profile.email) {
    settings.profile.email = 'email'
  }
  if (!settings.profile.id) {
    settings.profile.id = 'uid'
  }
  return settings
}

export function createSamlProtocolWebBinding(idp: IdentityProvider, passport: passport.Authenticator, baseUrlPath: string): IngressProtocolWebBinding {
  const { profile: profileKeys, ...settings } = applyDefaultProtocolSettings(idp)
  // TODO: this will need the the saml callback override change
  settings.path = `${baseUrlPath}/callback`
  const samlStrategy = new SamlStrategy(settings,
    (function samlSignIn(req, profile, done) {
      if (!profile) {
        return done(new Error('missing saml profile'))
      }
      const uid = profile[profileKeys.id!]
      if (!uid || typeof uid !== 'string') {
        return done(new Error(`saml profile missing id for key ${profileKeys.id}`))
      }
      const idpAccount: IdentityProviderUser = {
        username: uid,
        displayName: profile[profileKeys.displayName!] as string,
        email: profile[profileKeys.email!] as string | undefined,
        phones: [],
      }
      const webUser: Pick<Express.User, 'admittingFromIdentityProvider'> = {
        admittingFromIdentityProvider: {
          idpName: idp.name,
          account: idpAccount,
        }
      }
      try {
        const relayState = JSON.parse(req.body.RelayState) || {}
        if (!relayState) {
          return done(new Error('missing saml relay state'))
        }
        if (relayState.initiator !== 'mage') {
          return done(new Error(`invalid saml relay state initiator: ${relayState.initiator}`))
        }
        webUser.admittingFromIdentityProvider!.flowState = relayState.flowState
      }
      catch (err) {
        return done(err as Error)
      }
      done(null, webUser)
    }) as VerifyWithRequest,
    (function samlSignOut() {
      console.warn('saml sign out unimplemented')
    }) as VerifyWithRequest
  )
  const handleIngressFlowRequest = express.Router()
    .post('/callback',
      passport.authenticate(samlStrategy),
    )
  return {
    ingressResponseType: IngressResponseType.Redirect,
    beginIngressFlow(req, res, next, flowState): any {
      const RelayState = JSON.stringify({ initiator: 'mage', flowState })
      passport.authenticate(samlStrategy, { additionalParams: { RelayState } } as any)(req, res, next)
    },
    handleIngressFlowRequest
  }
}