import winston from 'winston'
import { Logger } from './entities/entities.logging'

const { combine, timestamp, errors, splat, printf, colorize } = winston.format

/**
 * The root winston logger.  Use child() to create component-scoped loggers
 * whose metadata appears on every message:
 *   rootLogger.child({ component: 'settings' })
 */
export const rootLogger: winston.Logger = winston.createLogger({
  level: process.env.MAGE_LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    splat(),
    printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : ''
      return `${timestamp} [${String(level).toUpperCase()}] ${message} ${metaString}`
    })
  ),
  transports: [new winston.transports.Console()],
})

// compile-time check that winston.Logger satisfies the domain Logger contract
const _structuralCheck: Logger = rootLogger
void _structuralCheck

// a dedicated logger for mongoose
export const mongooseLogger = winston.createLogger({
  level: 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : ''
      return `${timestamp} [MONGOOSE:${level}] ${message} ${metaString}`
    })
  ),
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
