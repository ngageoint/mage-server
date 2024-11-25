import passport from 'passport'
import { IngressProtocolWebBindingCache } from './ingress.adapters.controllers.web'
import { IdentityProvider, IdentityProviderRepository } from './ingress.entities'
import { IngressProtocolWebBinding } from './ingress.protocol.bindings'
import { createLdapProtocolWebBinding } from './ingress.protocol.ldap'
import { createLocalProtocolWebBinding } from './ingress.protocol.local'
import { createOAuthProtocolWebBinding } from './ingress.protocol.oauth'
import { createOIDCProtocolWebBinding } from './ingress.protocol.oidc'
import { createSamlProtocolWebBinding } from './ingress.protocol.saml'
import { MageLocalIdentityProviderService } from './local-idp.services.api'

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
}

function createWebBinding(idp: IdentityProvider, services: BindingServices) {
  if (idp.protocol === 'local') {
    return createLocalProtocolWebBinding(services.passport, services.localIdp)
  }
  throw new Error(`cannot create ingress web binding for idp:\n${JSON.stringify(idp, null, 2)}`)
}