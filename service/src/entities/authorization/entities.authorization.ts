import { AnyPermission } from './entities.permissions'

export type RoleId = string

export interface Role {
  id: RoleId
  name: string
  description?: string
  permissions: AnyPermission[]
}
