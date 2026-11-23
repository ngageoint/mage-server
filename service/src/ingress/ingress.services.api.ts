import { User, UserRepository } from '../entities/users/entities.users'
import { AuthenticationBinding, IdentityProvider, IdentityProviderAccount } from './ingress.entities'

export type EnrollmentResult =
  | {
    enrolled: {
      mageAccount: User,
      authBinding: AuthenticationBinding,
    }
    error: false
  }
  | {
    enrolled: false
    error: ReturnType<UserRepository['createUser']> | Error
  }

export type EnrollmentService = {
  (idpAccount: IdentityProviderAccount, idp: IdentityProvider): Promise<EnrollmentResult>
}
