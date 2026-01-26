// service/src/logger.js
const winston = require('winston');

// extract the format helpers correctly
const { combine, timestamp, errors, splat, printf, colorize } = winston.format;

// centralized logger
const log = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    splat(),
    printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level.toUpperCase()}] ${message} ${metaString}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// create a dedicated logger for mongoose
const mongooseLogger = winston.createLogger({
  level: 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [MONGOOSE:${level}] ${message} ${metaString}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// export both
module.exports = {
  info: (msg, meta) => log.info(msg, meta),
  warn: (msg, meta) => log.warn(msg, meta),
  error: (msg, meta) => log.error(msg, meta),
  debug: (msg, meta) => log.debug(msg, meta),
  mongooseLogger, // use this in adapters/db files
};
