import express from 'express'
import { Logger } from '../entities/entities.logging'

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const loggedPathPrefixes = ['/api', '/auth']

function sanitizeUrl(originalUrl: string): string {
  // redact token credentials that some routes accept via query string
  return originalUrl.replace(/([?&]access_token=)[^&]+/, '$1[REDACTED]')
}

/**
 * Log every request under /api and /auth with the user that made it.
 * Logging happens on the response finish event, after passport's bearer
 * strategy has resolved the request token to req.user, so the log line
 * carries the acting user's name rather than a token.
 */
export function httpRequestLogging(log: Logger): express.RequestHandler {
  return (req, res, next) => {
    if (!loggedPathPrefixes.some(p => req.path === p || req.path.startsWith(p + '/'))) {
      return next()
    }
    const start = Date.now()
    res.on('finish', () => {
      const principal = req.user as { id?: string, username?: string } | undefined
      const user = principal?.username ?? 'anonymous'
      const message = `${req.method} ${sanitizeUrl(req.originalUrl)}`
      const meta: Record<string, unknown> = { user, userId: principal?.id, status: res.statusCode, duration: Date.now() - start }
      if (!principal) {
        const attempted = (req.body as { username?: unknown } | undefined)?.username
        if (typeof attempted === 'string' && attempted) {
          meta.attemptedUser = attempted
        }
      }
      if (res.statusCode === 401 || res.statusCode === 403) {
        log.warn(message, meta)
      }
      else if (mutatingMethods.has(req.method)) {
        log.info(message, meta)
      }
      else {
        log.debug(message, meta)
      }
    })
    next()
  }
}
