import { UserDocument } from '../../models/user'

declare module 'express-serve-static-core' {
  export interface Request {
    user: UserDocument
    /**
     * Return the root HTTP URL of the server.
     */
    getRoot(): string
  }
}