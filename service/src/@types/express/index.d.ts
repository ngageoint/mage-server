import { UserExpanded as MageUser } from '../../entities/users/entities.users'
import { IdentityProviderUser } from '../../ingress/ingress.entities'


export type WebIngressUserFromSessionToken = { from: 'sessionToken', account: MageUser }
export type WebIngressUserFromIdentityProvider = { from: 'identityProvider', account: IdentityProviderUser }
/**
 * The `WebIngressUser` type determines the ingress path of the requesting user through the Passport middleware stack.
 * When the `mage` key is present, the requesting user authenticated using an established Mage session token.  When the
 * `identityProvider` key is present, the requesting user authenticated with a third party identity provider account
 * and will establish a new Mage session.
 */
export type WebIngressUser = WebIngressUserFromSessionToken | WebIngressUserFromIdentityProvider

declare module 'express-serve-static-core' {
  export interface Request {
    user?: Express.User & WebIngressUser
    token?: string
    // TODO: users-next: reconcile these two device properties and change to device entity
    provisionedDevice?: any
    provisionedDeviceId?: string
    /**
     * Return the root HTTP URL of the server, including the scheme, e.g.,
     * `https://mage.io`.
     */
    getRoot(): string
    /**
     * Return the fully qualified request path, which is the path of the
     * request concatenated to the result of {@link getRoot()}
     */
    getPath(): string
  }
}