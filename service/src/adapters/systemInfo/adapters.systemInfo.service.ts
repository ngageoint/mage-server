import { Connection } from 'mongoose'
import { SystemInfo, SystemInfoService } from '../../entities/systemInfo/entities.systemInfo'

export class SystemInfoServiceImpl implements SystemInfoService {

  private mongodbVersion: string | null = null
  private readonly nodeVersion: string = process.versions.node

  constructor(private readonly dbConn: Connection) {}

  async readSystemInfo(): Promise<SystemInfo> {
    if (this.mongodbVersion === null) {
      const dbInfo = await this.dbConn.db.admin().serverInfo()
      this.mongodbVersion = dbInfo.version
    }
    return {
      mageVersion: 'TODO: add version here',
      nodeVersion: this.nodeVersion,
      monogdbVersion: this.mongodbVersion!,
    }
  }

  readDependencies(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }
}