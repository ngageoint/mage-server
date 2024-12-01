import express from 'express'
import { SearchUsers, UserSearchRequest, CreateUserOperation } from '../../app.api/users/app.api.users'
import { WebAppRequestFactory } from '../adapters.controllers.web'
import { calculatePagingLinks } from '../../entities/entities.global'
import { defaultHandler as upload } from '../../upload'
import { Phone, UserExpanded, UserIcon } from '../../entities/users/entities.users'
import { invalidInput, InvalidInputError } from '../../app.api/app.api.errors'
import { AppRequest } from '../../app.api/app.api.global'

export interface UsersAppLayer {
  createUser: CreateUserOperation
  searchUsers: SearchUsers
}

export function UsersRoutes(app: UsersAppLayer, createAppRequest: WebAppRequestFactory<AppRequest<UserExpanded>>): express.Router {

  const routes = express.Router()

  routes.route('/')
    .post(
      access.authorize('CREATE_USER'),
      upload.fields([ { name: 'avatar' }, { name: 'icon' } ]),
      function (req, res, next) {
        const accountForm = validateAccountForm(req)
        if (accountForm instanceof Error) {
          return next(accountForm)
        }
        const iconAttrs = parseIconUpload(req)
        if (iconAttrs instanceof Error) {
          return next(iconAttrs)
        }
        const user = {
          username: accountForm.username,
          roleId: accountForm.roleId,
          active: true, // Authorized to update users, activate account by default
          displayName: accountForm.displayName,
          email: accountForm.email,
          phones: accountForm.phones,
          authentication: {
            type: 'local',
            password: accountForm.password,
            authenticationConfiguration: {
              name: 'local'
            }
          }
        }
        const files = req.files as Record<string, Express.Multer.File[]> || {}
        const [ avatar ] = files.avatar || []
        const [ icon ] = files.icon || []

        // TODO: users-next
        app.createUser()
        new api.User().create(user, { avatar, icon }).then(newUser => {
          newUser = userTransformer.transform(newUser, { path: req.getRoot() });
          res.json(newUser);
        }).catch(err => next(err));
      }
    );

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
      }
      const appReq = createAppRequest(req, { userSearch })
      const appRes = await app.searchUsers(appReq)
       if (appRes.success) {
         const links = calculatePagingLinks(
           { pageSize: userSearch.pageSize, pageIndex: userSearch.pageIndex },
           appRes.success.totalCount
         )
         const responseWithLinks = {
           ...appRes.success,
           links
         }
         return res.json(responseWithLinks)
       }
      next(appRes.error)
    })

  return routes
}

interface AccountForm {
  username: string
  password: string
  displayName: string
  email?: string
  phones?: Phone[]
  roleId: string
}

function validateAccountForm(req: express.Request): AccountForm | InvalidInputError {
  const username = req.body.username
  if (typeof username !== 'string' || username.length === 0) {
    return invalidInput('username is required')
  }
  const displayName = req.body.displayName
  if (typeof displayName !== 'string' || displayName.length === 0) {
    return invalidInput('displayName is required')
  }
  const email = req.body.email
  if (typeof email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\./
    if (!emailRegex.test(email)) {
      return invalidInput('invalid email')
    }
  }
  const formPhone = req.body.phone
  const phones: Phone[] = typeof formPhone === 'string' ?
    [ { type: 'Main', number: formPhone } ] : []
  const password = req.body.password
  if (typeof password !== 'string') {
    return invalidInput('password is required')
  }
  const roleId = req.body.roleId
  if (typeof roleId !== 'string') {
    return invalidInput('roleId is required')
  }
  return {
    username: username.trim(),
    password,
    displayName,
    email,
    phones,
    roleId,
  }
}

function parseIconUpload(req: express.Request): UserIcon | InvalidInputError {
  const formIconAttrs = req.body.iconMetadata || {} as any
  const iconAttrs: Partial<UserIcon> =
    typeof formIconAttrs === 'string' ?
      JSON.parse(formIconAttrs) :
      formIconAttrs
  const files = req.files as Record<string, Express.Multer.File[]> || { icon: [] }
  const [ iconFile ] = files.icon || []
  if (iconFile) {
    if (!iconAttrs.type) {
      iconAttrs.type = UserIconType.Upload
    }
    if (iconAttrs.type !== 'create' && iconAttrs.type !== 'upload') {
      // TODO: does this really matter? just take the uploaded image
      return invalidInput(`invalid icon type: ${iconAttrs.type}`)
    }
  }
  return { type: UserIconType.None }
}