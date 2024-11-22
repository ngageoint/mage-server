import passport from 'passport'
import LdapStrategy from 'passport-ldapauth'
import { IdentityProvider, IdentityProviderUser } from './ingress.entities'
import { IngressProtocolWebBinding, IngressResponseType } from './ingress.protocol.bindings'


type LdapProfileKeys = {
  id?: string
  email?: string
  displayName?: string
}

type LdapProtocolSettings = LdapStrategy.Options['server'] & {
  profile?: LdapProfileKeys
}

type ReadyLdapProtocolSettings = Omit<LdapProtocolSettings, 'profile'> & { profile: Required<LdapProfileKeys> }

function copyProtocolSettings(from: LdapProtocolSettings): LdapProtocolSettings {
  const copy = { ...from }
  if (copy.profile) {
    copy.profile = { ...from.profile! }
  }
  return copy
}

function applyDefaultProtocolSettings(idp: IdentityProvider): ReadyLdapProtocolSettings {
  const settings = copyProtocolSettings(idp.protocolSettings as LdapProtocolSettings)
  const profileKeys = settings.profile || {}
  if (!profileKeys.displayName) {
    profileKeys.displayName = 'givenname';
  }
  if (!profileKeys.email) {
    profileKeys.email = 'mail';
  }
  if (!profileKeys.id) {
    profileKeys.id = 'cn';
  }
  settings.profile = profileKeys
  return settings as ReadyLdapProtocolSettings
}

function strategyOptionsFromProtocolSettings(settings: ReadyLdapProtocolSettings): LdapStrategy.Options {
  return {
    server: {
      url: settings.url,
      bindDN: settings.bindDN,
      bindCredentials: settings.bindCredentials,
      searchBase: settings.searchBase,
      searchFilter: settings.searchFilter,
      searchScope: settings.searchScope,
      groupSearchBase: settings.groupSearchBase,
      groupSearchFilter: settings.groupSearchFilter,
      groupSearchScope: settings.groupSearchScope,
      bindProperty: settings.bindProperty,
      groupDnProperty: settings.groupDnProperty
    }
  }
}

export function createWebBinding(idp: IdentityProvider, passport: passport.Authenticator): IngressProtocolWebBinding {
  const settings = applyDefaultProtocolSettings(idp)
  const profileKeys = settings.profile
  const strategyOptions = strategyOptionsFromProtocolSettings(settings)
  const verify: LdapStrategy.VerifyCallback = (profile, done) => {
    const idpAccount: IdentityProviderUser = {
      username: profile[profileKeys.id],
      displayName: profile[profileKeys.displayName],
      email: profile[profileKeys.email],
      phones: [],
      idpAccountId: profile[profileKeys.id]
    }
    const webIngressUser: Express.User = {
      admittingFromIdentityProvider: {
        account: idpAccount,
        idpName: idp.name,
      }
    }
    return done(null, webIngressUser)
  }
  const title = idp.title
  const authOptions: LdapStrategy.AuthenticateOptions = {
    invalidLogonHours: `Access to ${title} account is prohibited at this time.`,
    invalidWorkstation: `Access to ${title} account is prohibited from this workstation.`,
    passwordExpired: `${title} password expired.`,
    accountDisabled: `${title} account disabled.`,
    accountExpired: `${title} account expired.`,
    passwordMustChange: `${title} account requires password reset.`,
    accountLockedOut: `${title} account locked.`,
    invalidCredentials: `Invalid ${title} credentials.`,
  }
  const ldapIdp = new LdapStrategy(strategyOptions, verify)
  return {
    ingressResponseType: IngressResponseType.Direct,
    beginIngressFlow(req, res, next, flowState): any {
      const completeIngress: passport.AuthenticateCallback = (err, user) => {
        if (err) {
          return next(err)
        }
        if (user && user.admittingFromIdentityProvider) {
          user.admittingFromIdentityProvider.flowState = flowState
          req.user = user
          return next()
        }
        return res.status(500).send('internal server error: invalid ldap ingress state')
      }
      passport.authenticate(ldapIdp, authOptions, completeIngress)(req, res, next)
    },
    handleIngressFlowRequest(req, res): any {
      return res.status(400).send('invalid ldap ingress request')
    }
  }
}