
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
  mageVersion: string
  environment: EnvironmentInfo
  disclaimer: any // mongoose Document type
  contactInfo: any 
}