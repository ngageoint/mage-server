import express from 'express'
import { ErrEntityNotFound, ErrInvalidInput, ErrPermissionDenied, MageError, PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequest } from '../app.api/app.api.global';

export interface WebAppRequestFactory {
  <RequestParams>(webReq: express.Request, params?: RequestParams): AppRequest & RequestParams
}

export const mageAppErrorHandler: express.ErrorRequestHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction): any  => {
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
  }
  next(err)
}