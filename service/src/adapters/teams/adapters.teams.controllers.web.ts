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
      const queryParamArray = (ids: any): string[] | undefined => {
        if (typeof ids === 'string') {
          return [ids]
        } else if (Array.isArray(ids) && ids.every(id => typeof id === 'string')) {
          return ids
        } else {
          return undefined
        }
      }

      const teamSearch: TeamSearchRequest['teamSearch'] = {
        omitEventTeams: 'true' === String(req.query.omit_event_teams).toLowerCase(),
        nameOrContactTerm: req.query.term as string | undefined,
        pageSize: parseInt(String(req.query.page_size)) || 250,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: typeof req.query.total === 'string' ? 'true' === String(req.query.total).toLowerCase() : undefined,
        withMembers: queryParamArray(req.query.with_members),
        withoutMembers: queryParamArray(req.query.without_members)
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
