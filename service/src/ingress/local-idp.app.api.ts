import { EntityNotFoundError, InvalidInputError } from '../app.api/app.api.errors'
import { AppResponse } from '../app.api/app.api.global'
import { LocalIdpAccount, LocalIdpCredentials } from './local-idp.entities'


export interface LocalIdpAuthenticateOperation {
  (req: LocalIdpCredentials): Promise<AppResponse<LocalIdpAccount, EntityNotFoundError | InvalidInputError>>
}

export interface LocalIdpCreateAccountOperation {
  (req: LocalIdpCredentials): Promise<AppResponse<LocalIdpAccount, EntityNotFoundError | InvalidInputError>>
}
