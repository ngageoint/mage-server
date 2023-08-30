
export interface EnvironmentInfo {
  nodeVersion: string
  monogdbVersion: string
  // TODO: maybe relavant environment variables? redact sensitive values
}

export interface EnvironmentService {
  readEnvironmentInfo(): Promise<EnvironmentInfo>
  // TODO: how to build dependency list/tree with all versions
  readDependencies(): Promise<unknown>
}

export interface SystemInfo {
  /**
   * These [semantic](https://semver.org/) version components are parsed from
   * the package version to allow the mobile apps to check compatibility with
   * the server.  Without this structure, the apps will not allow interaction
   * with the server.
   */
  version: { major: number, minor: number, micro: number }
  /**
   * Package version string straight from package.json
   */
  environment: EnvironmentInfo
  disclaimer: any // mongoose Document type
  contactInfo: any
}

export enum SystemInfoRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum SystemInfoAccessType {
  Read = 'read',
}

export type SystemInfoRolePermissions = { [role in SystemInfoRole]: SystemInfoAccessType[] }

export const SystemInfoRolePermissions: SystemInfoRolePermissions = {
  ADMIN: [ SystemInfoAccessType.Read ],
  USER: [],
}

export function rolesWithPermission(permission: SystemInfoAccessType): SystemInfoRole[] {
  const roles: SystemInfoRole[] = [];
  for (const key in SystemInfoRolePermissions) {
    if (SystemInfoRolePermissions[key as SystemInfoRole].indexOf(permission) !== -1) {
      roles.push(key as SystemInfoRole);
    }
  }
  return roles;
}
