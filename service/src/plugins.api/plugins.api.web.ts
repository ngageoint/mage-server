import express from 'express'
import { AppRequestContext } from '../app.api/app.api.global'
import { UserExpanded } from '../entities/users/entities.users'

export interface GetAppRequestContext {
  (req: express.Request): AppRequestContext<UserExpanded>
}

export interface WebRoutesHooks {
  webRoutes(requestContext: GetAppRequestContext): express.Router
}
