
import path from 'path'
import * as migrations from 'mongodb-migrations'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const log = require('winston')

export const migrationCollection = 'migrations'

class MigrationContext {

  readonly migrator: migrations.Migrator

  private resolve: (() => any) | null = null
  private reject: ((err: any) => any) | null = null

  constructor(migrationCollection: string, dbUrl: string, connOptions: migrations.MongoClientOptions) {
    const config: migrations.MigratorConfig = {
      collection: migrationCollection,
      url: dbUrl,
      options: connOptions,
    }
    this.migrator = new migrations.Migrator(config, (level, msg) => {
      log.info(msg)
    })
  }

  runFromDir(dir: string): Promise<void> {
    return new Promise<void>(
      function (this: MigrationContext, resolve: () => any, reject: () => any): any {
        this.resolve = resolve
        this.reject = reject
        this.migrator.runFromDir(dir, this.onFinished.bind(this))
      }.bind(this)
    )
  }

  onFinished(err: any, results: migrations.MigrationSetResults): void {
    if (err) {
      log.error('database migrations failed: ', err)
      log.error('migration results:\n' + JSON.stringify(results, null, 2))
      process.exit(1)
    }
    log.info(`all migrations complete`, results)
    this.migrator.dispose(err => {
      if (err) {
        log.error('error disposing migration resources: ', err)
        this.reject && this.reject(err)
      }
      this.resolve && this.resolve()
    })
  }
}

// TODO: inject mongo connection; not possible with mongodb-migrations lib
export async function runDatabaseMigrations(mongoUrl: string, mongoOptions?: migrations.MongoClientOptions): Promise<void> {
  try {
    const migrationsDir = path.resolve(__dirname, 'migrations')
    log.info(`running database migrations in directory ${migrationsDir} ...`)
    const context = new MigrationContext('migrations', mongoUrl, mongoOptions || {})
    await context.runFromDir(migrationsDir)
  }
  catch (err) {
    log.error(`error connecting to database: `, err)
    process.exit(1)
  }
}


