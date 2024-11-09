import express from 'express'
import { IdentityProvider, IdentityProviderUser } from './ingress.entities'

export type IdentityProviderAdmissionWebUser = {
  idpName: string
  account: IdentityProviderUser
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      /**
       * The ingress protocol must populate `req.user` with an object that has the `admittingFromIdentityProvider`
       * property.  When using a Passport strategy middleware to handle the authentication flow, the protocol would
       * invoke Passport's callback like
       * ```
       * done(null, { admittingFromIdentityProvider: { idpName: 'example', account: { ... } } })
       * ```
       */
      admittingFromIdentityProvider?: IdentityProviderAdmissionWebUser
    }
  }
}

/**
 * `IngressProtocolWebBinding` is the binding of an authentication protocol's HTTP requests to an identity provider.
 * The protocol uses the identity provider settings to determine the identity provider's endpoints and orchestrate the
 * flow of HTTP messages between the Mage client, Mage server, and the identity provider's endpoints.
 */
export interface IngressProtocolWebBinding {
  idp: IdentityProvider
  handleRequest: express.RequestHandler
}

