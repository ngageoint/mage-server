import express from 'express'
import { ErrEntityNotFound, ErrInfrastructure, ErrInvalidInput, ErrPermissionDenied, MageError, PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequest } from '../app.api/app.api.global'
import { MageEvent, MageEventId, MageEventRepository } from '../entities/events/entities.events'

export interface WebAppRequestFactory<Req extends AppRequest = AppRequest> {
  <RequestParams extends object = {}>(webReq: express.Request, params?: RequestParams): Req & RequestParams
}

export const eventScopeKey = 'eventScope' as const

export function ensureEventScope(eventRepo: MageEventRepository): express.RequestHandler {
  return async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    const eventIdFromPath = req.params[eventScopeKey]
    const eventId: MageEventId = parseInt(eventIdFromPath)
    const mageEvent = Number.isInteger(eventId)
      ? await eventRepo.findById(eventId)
      : null
    if (mageEvent) {
      req[eventScopeKey] = { mageEvent }
      next()
      return
    }
    res.status(404).json(`event not found: ${eventIdFromPath}`)
  }
}

declare module 'express' {
  interface Request {
    [eventScopeKey]?: {
      mageEvent: MageEvent
    }
  }
}

/**
 * Send HTTP responses with status codes that map to error codes of
 * {@link MageError} instances from the application layer.  For example, send
 * a `403` response for {@link ErrPermissionDenied}.
 */
export const mageAppErrorHandler: express.ErrorRequestHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction): any  => {
  console.error(new Date().toISOString(), '- error processing request', req.method, req.path, err)
  if (!(err instanceof MageError)) {
    return next(err)
  }
  switch (err.code) {
    case ErrPermissionDenied:
      return res.status(403).json(`permission denied: ${(err as PermissionDeniedError).data.permission}`)
    case ErrEntityNotFound:
      return res.status(404).json(err.message)
    case ErrInvalidInput:
      return res.status(400).json(err.message)
    case ErrInfrastructure:
      return res.status(500).json(err.message)
  }
  next(err)
}

/**
 * This is the same as {@link mageAppErrorHandler}, but instead of just a bare
 * JSON string as the request body, sends a JSON object as the response like
 * ```
 * { "message": "the error message" }
 * ```
 * This is what clients expect from the legacy routes, so new routes that
 * replace them need to send errors in this structure.
 */
export const compatibilityMageAppErrorHandler: express.ErrorRequestHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction): any  => {
  console.error(new Date().toISOString(), '- error processing request', req.method, req.path, err)
  if (!(err instanceof MageError)) {
    return next(err)
  }
  switch (err.code) {
    case ErrPermissionDenied:
      return res.status(403).json({ message: `permission denied: ${(err as PermissionDeniedError).data.permission}` })
    case ErrEntityNotFound:
      return res.status(404).json({ message: err.message })
    case ErrInvalidInput:
      return res.status(400).json({ message: err.message })
    case ErrInfrastructure:
      return res.status(500).json({ message: err.message })
  }
  next(err)
}