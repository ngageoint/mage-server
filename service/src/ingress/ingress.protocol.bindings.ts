import express from 'express'
import { IdentityProviderUser } from './ingress.entities'

export type IdentityProviderAdmissionWebUser = {
  idpName: string
  account: IdentityProviderUser | undefined
  flowState?: string | undefined
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

export enum IngressResponseType {
  Direct = 'Direct',
  Redirect = 'Redirect'
}

/**
 * `IngressProtocolWebBinding` is the binding of an authentication protocol's HTTP requests to an identity provider.
 * The protocol uses the identity provider settings to determine the identity provider's endpoints and orchestrate the
 * flow of HTTP messages between the Mage client, Mage server, and the identity provider's endpoints.
 */
export interface IngressProtocolWebBinding {
  ingressResponseType: IngressResponseType
  /**
   * This function initiates the protocol's ingress process, which starts with a request to the `/signin` path of the
   * IDP's context, e.g., `GET /auth/google-oidc/signin`.
   *
   * The `flowState` parameter is a URL-safe, percent-encoded string value which holds any state information the app
   * needs to persist across multiple ingress protocol requests.
   * This is primarily for saving information about how Mage delivers the final ingress result to the client, such as
   * a direct response, or a redirect URL suitable for the modile or web apps.
   * Different protocols have different ways of persisting state across requests, such as the OAuth/OpenID Connect
   * `state` parameter and the SAML `RelayState` body attribute.  The protocol must store this value and return the
   * value in the {@link IdentityProviderAdmissionWebUser#flowState admission result}.
   */
  beginIngressFlow(req: express.Request, res: express.Response, next: express.NextFunction, flowState: string | undefined): any
  handleIngressFlowRequest: express.RequestHandler
}

