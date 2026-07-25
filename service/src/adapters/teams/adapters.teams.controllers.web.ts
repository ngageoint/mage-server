import express from 'express'
import { SearchTeams, TeamSearchRequest } from '../../app.api/teams/app.api.teams'
import { calculatePagingLinks } from '../../entities/entities.global'
import { WebAppRequestFactory } from '../adapters.controllers.web'

export interface TeamsAppLayer {
  searchTeams: SearchTeams
}

export function TeamsRoutes(app: TeamsAppLayer, createAppRequest: WebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/search')
    .get(async (req, res, next) => {
      const teamSearch: TeamSearchRequest['teamSearch'] = {
        omitEventTeams: req.query.omit_event_teams ? /^true$/i.test(String(req.query.omit_event_teams)) : false,
        nameOrContactTerm: req.query.term as string | undefined,
        pageSize: parseInt(String(req.query.page_size)) || 250,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: req.query.total ? /^true$/i.test(String(req.query.total)) : true
      };

      const appReq = createAppRequest(req, { teamSearch })
      const appRes = await app.searchTeams(appReq)
      if (appRes.success) {
        const links = calculatePagingLinks(
          { pageSize: teamSearch.pageSize, pageIndex: teamSearch.pageIndex },
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
