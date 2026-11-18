import { Role, RoleRepository } from '../entities/authorization/entities.authorization'

type Callback<R> = (err: any, result?: R) => any

export declare function initialize(repos: { roleRepo: RoleRepository }): void
export declare function getRoleById(id: string, callback: Callback<Role | null>): void
export declare function getRole(name: string, callback: Callback<Role | null>): void
export declare function getRoles(callback: Callback<Role[]>): void
export declare function createRole(role: Partial<Role>, callback: Callback<Role>): void
export declare function updateRole(id: string, update: Partial<Role>, callback: Callback<Role>): void
export declare function deleteRole(role: Role | { id: string }, callback: Callback<Role>): void
