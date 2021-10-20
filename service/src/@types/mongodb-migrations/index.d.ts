

declare module 'mongodb-migrations' {

  import { MongoClientOptions } from 'mongodb'
  export { MongoClientOptions } from 'mongodb'

  export class Migrator {

    constructor(config: MigratorConfig, log?: LogFunction | null)
    /**
     * Return a promise that resolves to the created migration file name.
     * @param description the migration description
     */
    create(dir: string, id: string, callback: (err: any) => any): void
    /**
     * Add the given migration to this migrator.
     */
    add(m: Migration): void
    /**
     * Add all the {@linkcode Migration} objects in the given array to this
     * migrator.
     */
    bulkAdd(m: Migration[]): void
    /**
     * Apply the {@link Migration | migrations} {@link Migrator.add | added} to this
     * migrator by calling {@linkcode Migration.up} on each migration.
     * @param done
     * @param progress
     */
    migrate(done: DoneCallback, progress: ProgressCallback): void
    /**
     * Reverse the {@link Migration | migrations} {@link Migrator.add | added} to this
     * migrator by calling {@linkcode Migration.down} on each migration.
     * @param done
     * @param progress
     */
    rollback(done: DoneCallback, progress: ProgressCallback): void
    /**
     * Run the {@linkcode Migration} modules found in the given directory.
     * @param dir a directory path containing migration scripts
     * @param done a function to call when the whole migration set is complete
     * @param progress a function to call when each individual migration completes
     */
    runFromDir(dir: string, done: DoneCallback, progress?: ProgressCallback): void
    /**
     * Release the MongoDB connection pool associted with this migrator.
     * @param callback
     */
    dispose(callback: (err: any) => any): void
  }

  export type LogFunction = (level: 'system' | 'user', message: string) => any
  export type DoneCallback = (err: any, results: MigrationSetResults) => any
  export type ProgressCallback = (migrationId: string, result: MigrationResult) => any

  export interface MigratorConfig {
    /**
     * This is the URL that defines how to connect to the MongoDB database
     * server.
     */
    url: string,
    /**
     * This is the name of the collection that stores migration information.
     * The default value is  `'_migrations'`.
     */
    collection?: string,
    /**
     * `directory` is the path where migration scripts are.  This is only used
     * when running from the command line, which passes `directory` from the
     * config object to `{@linkcode Migrator.runFromDir}.
     */
    directory?: string,
    options?: MongoClientOptions
  }

  export interface Migration {
    id: string
    up?: (callback: (err: any) => any) => any
    down?: (callback: (err: any) => any) => any
  }

  export interface MigrationResult {
    status: 'ok' | 'skip' | 'error'
    error: Error
    /**
     * Indicate why a migration was skipped.
     */
    code: 'no_up' | 'no_down' | 'already_ran' | 'not_in_recent_migrate'
    /**
     * Human-readable explanation of `code`
     */
    reason: string
  }

  export interface MigrationSetResults {
    [migrationId: string]: MigrationResult
  }
}