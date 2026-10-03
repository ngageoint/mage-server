
export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
}

export type RoleId = string

export interface RoleRepository {
  findAll(): Promise<Role[]>
  findById(id: RoleId): Promise<Role | null>
  findByName(name: string): Promise<Role | null>
  create(role: Omit<Role, 'id'>): Promise<Role>
  update(role: Partial<Role> & { id: RoleId }): Promise<Role | null>
  removeById(id: RoleId): Promise<Role | null>
}
