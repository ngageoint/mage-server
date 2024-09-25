import { EntityNotFoundError, InvalidInputError } from '../app.api/app.api.errors'
import { AppResponse } from '../app.api/app.api.global'
import { LocalIdpAccount } from './local-idp.entities'


export interface LocalIdpAuthenticateRequest {
  username: string
  password: string
}

export interface LocalIdpAuthenticateOperation {
  (req: LocalIdpAuthenticateRequest): Promise<AppResponse<LocalIdpAccount, EntityNotFoundError | InvalidInputError>>
}