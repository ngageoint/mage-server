import winston from 'winston'
import { Logger } from './entities/entities.logging'

const { combine, timestamp, errors, splat, printf, colorize, json } = winston.format

/**
 * MAGE_LOG_FORMAT=json switches output to one JSON object per line so log
 * collectors (Splunk, CloudWatch, etc.) can index the metadata fields
 * without regex extractions.  Any other value yields a more readable
 * console format.
 */
const jsonOutput = process.env.MAGE_LOG_FORMAT === 'json'

const jsonFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json()
)

const consoleFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : ''
    return `${timestamp} [${String(level).toUpperCase()}] ${message} ${metaString}`
  })
)

/**
 * The root winston logger.  Use child() to create component-scoped loggers
 * whose metadata appears on every message:
 *   rootLogger.child({ component: 'settings' })
 */
export const rootLogger: winston.Logger = winston.createLogger({
  level: process.env.MAGE_LOG_LEVEL || 'info',
  format: jsonOutput ? jsonFormat : consoleFormat,
  transports: [new winston.transports.Console()],
})

// compile-time check that winston.Logger satisfies the domain Logger contract
const _structuralCheck: Logger = rootLogger
void _structuralCheck

const mongooseConsoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : ''
    return `${timestamp} [MONGOOSE:${level}] ${message} ${metaString}`
  })
)

// a dedicated logger for mongoose; in JSON mode the MONGOOSE prefix moves
// into a component field so the output stays machine-parseable
export const mongooseLogger = winston.createLogger({
  level: process.env.MONGOOSE_LOG_LEVEL || 'info',
  format: jsonOutput ? jsonFormat : mongooseConsoleFormat,
  defaultMeta: jsonOutput ? { component: 'mongoose' } : undefined,
  transports: [new winston.transports.Console()],
})

// flat convenience API preserved for legacy CommonJS require() call sites
export const info = rootLogger.info.bind(rootLogger)
export const warn = rootLogger.warn.bind(rootLogger)
export const error = rootLogger.error.bind(rootLogger)
export const debug = rootLogger.debug.bind(rootLogger)
export const child = (meta: Record<string, unknown>): Logger => rootLogger.child(meta)

const log = {
  info,
  warn,
  error,
  debug,
  child,
  mongooseLogger,
  rootLogger,
}

export default log
