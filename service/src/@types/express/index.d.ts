import { UserDocument } from '../../models/user'

declare module 'express-serve-static-core' {
  export interface Request {
    user: UserDocument & any
    provisionedDeviceId: string
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