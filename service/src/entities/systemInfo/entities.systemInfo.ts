
export interface SystemInfo {
  mageVersion: string
  nodeVersion: string
  monogdbVersion: string
  // TODO: maybe relavant environment variables? redact sensitive values
}

export interface SystemInfoService {
  readSystemInfo(): Promise<SystemInfo>
  // TODO: how to build dependency list/tree with all versions
  readDependencies(): Promise<unknown>
}