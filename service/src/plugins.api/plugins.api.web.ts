import express from 'express'
import { AppRequestContext } from '../app.api/app.api.global'
import { UserExpanded } from '../entities/users/entities.users'

export interface GetAppRequestContext {
  (req: express.Request): AppRequestContext<UserExpanded>
}

export type WebRoutesHooks = {
  webRoutes: {
    public?: (requestContext: GetAppRequestContext) => express.Router,
    protected?: (requestContext: GetAppRequestContext) => express.Router
  }
}