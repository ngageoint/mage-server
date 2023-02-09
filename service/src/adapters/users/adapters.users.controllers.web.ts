import express from 'express'
import { SearchUsers, UserSearchRequest } from '../../app.api/users/app.api.users'
import { WebAppRequestFactory } from '../adapters.controllers.web'

export interface UsersAppLayer {
  searchUsers: SearchUsers
}

export function UsersRoutes(app: UsersAppLayer, createAppRequest: WebAppRequestFactory) {

  const routes = express.Router()

  routes.route('/search')
    .get(async (req, res, next) => {
      const userSearch: UserSearchRequest['userSearch'] = {
        nameOrContactTerm: req.query.term as string | undefined,
        pageSize: parseInt(String(req.query.page_size)) || 250,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }
      const appReq = createAppRequest(req, { userSearch })
      const appRes = await app.searchUsers(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })
  return routes
}