import { InjectionToken } from '.'
import { UserRepository } from '../entities/users/entities.users'

export const UserRepositoryToken: InjectionToken<UserRepository> = Symbol('InjectUserRepository')