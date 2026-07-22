import { promises as fs } from 'fs';
import { ExportsRepository, ExportStatus, ExportStore } from "../../entities/exports/entities.exports";
import { Task } from '../../app';

const logger = require('../../logger')
const log = [ 'debug', 'info', 'warn', 'error', 'log' ].reduce((log: any, methodName: string): any => {
  const logMethod = logger[methodName] as (...args: any[]) => any
  return {
    ...log,
    [methodName]: (...args: any[]) => logMethod('[export:archive]', ...args)
  }
}, {} as any)

export class ExportArchiveTask implements Task {
  constructor(
    private readonly baseDir: string,
    private readonly interval: number,
    private readonly store: ExportStore,
    private readonly repository: ExportsRepository
  ) {}

  async run(): Promise<void> {
    log.info(`Initializing job to check ${this.baseDir} for expired export files every ${this.interval} seconds.`)

    log.debug(`Creating export directory: ${this.baseDir}`)
    await fs.mkdir(this.baseDir, { recursive: true })

    // Server restarted, update previously running exports to Failed
    const exports = await this.repository.getExports()
    for (const exp of exports) {
      if (exp.status === ExportStatus.Running) {
        log.info(`Updating status of ${exp.id} to failed and deleting export content`)
        await this.repository.updateExport(exp.id, { status: ExportStatus.Failed })
        await this.store.deleteContent(exp)
      }
    }

    await this.schedule()
  }

  private async schedule(): Promise<void> {
    await this.doTask()
    setTimeout(() => this.schedule(), this.interval * 1000);
  }

  private async doTask() {
    log.info('Checking for expired exports')

    try {
      const exports = await this.repository.getExports()
      for (const e of exports) {
        if (Date.now() > e.expirationDate.getTime()) {
          log.info(`Deleting expired export ${e.id}`)
          await this.repository.deleteExport(e.id)
          await this.store.deleteContent(e)
        }
      }
    } catch (err) {
      log.error('Error checking for expired exports', err)
    }
  }
}
