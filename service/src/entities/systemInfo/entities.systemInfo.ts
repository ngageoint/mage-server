
export interface EnvironmentInfo {
  nodeVersion: string
  mongodbVersion: string
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
  initial: boolean // is in initial setup with no users
  disclaimer: any // mongoose Document type
  contactInfo: any
}
