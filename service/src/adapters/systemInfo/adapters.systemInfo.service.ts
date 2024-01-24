import { Connection } from 'mongoose'
import { EnvironmentService, EnvironmentInfo } from '../../entities/systemInfo/entities.systemInfo'

export class EnvironmentServiceImpl implements EnvironmentService {

  private mongodbVersion: string | null = null
  private readonly nodeVersion: string = process.versions.node

  constructor(private readonly dbConn: Connection) {}

  async readEnvironmentInfo(): Promise<EnvironmentInfo> {
    if (this.mongodbVersion === null) {
      const dbInfo = await this.dbConn.db.admin().serverInfo()
      this.mongodbVersion = dbInfo.version
    }
    return {
      nodeVersion: this.nodeVersion,
      mongodbVersion: this.mongodbVersion!,
    }
  }

  readDependencies(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }
}