import { UserId } from '../entities/users/entities.users'
import {
  IdentityProvider,
  IdentityProviderId,
  IdentityProviderRepository,
  AuthenticationBindingRepository,
  AuthenticationBinding,
  UserIdentity
} from './ingress.entities'

export class MongooseIdentityProviderRepository implements IdentityProviderRepository {

  findIdpById(id: IdentityProviderId): Promise<IdentityProvider | null> {
    throw 'todo'
  }

  findIdpByName(name: string): Promise<IdentityProvider | null> {
    throw 'todo'
  }
}

export class MongooseAuthenticationBindingRepository implements AuthenticationBindingRepository {

    saveBindingIdentity(userId: UserId, identity: UserIdentity): Promise<AuthenticationBinding | Error> {
        throw new Error('Method not implemented.')
    }
}

