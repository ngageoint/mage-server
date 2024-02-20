import express from 'express'
import { SearchUsers, UserSearchRequest } from '../../app.api/users/app.api.users'
import { WebAppRequestFactory } from '../adapters.controllers.web'
import { calculateLinks } from '../../entities/entities.global'

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
        includeTotalCount: req.query.total ? /^true$/i.test(String(req.query.total)) : true,
        active:
          'active' in req.query
            ? /^true$/i.test(String(req.query.active))
            : undefined,
        enabled:
          'enabled' in req.query
            ? /^true$/i.test(String(req.query.enabled))
            : undefined
      };

      const appReq = createAppRequest(req, { userSearch })
      const appRes = await app.searchUsers(appReq)
       if (appRes.success) {
         const links = calculateLinks(
           { pageSize: userSearch.pageSize, pageIndex: userSearch.pageIndex },
           appRes.success.totalCount
         );

         const responseWithLinks = {
           ...appRes.success,
           links
         };

         return res.json(responseWithLinks);
       }
      next(appRes.error)
    })
  return routes
}