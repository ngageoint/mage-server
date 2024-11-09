import { UserExpanded } from '../../entities/users/entities.users'
import { Session } from '../../ingress/ingress.entities'


export type AdmittedWebUser = {
  account: UserExpanded
  session: Session
}

declare global {
  namespace Express {
    interface User {
      /**
       * Mage populates the `admitted` user property when the user completes the ingress authentication flow through an
       * identity provider and establishes a session.
       */
      admitted?: AdmittedWebUser
    }
  }
}

declare module 'express-serve-static-core' {
  export interface Request {
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