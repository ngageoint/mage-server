import express from 'express'
import zod from 'zod'
import { invalidInput, InvalidInputError } from '../../app.api/app.api.errors'
import {
  EnrollLocalUserByProxy,
  EnrollLocalUserByProxyRequest,
  LocalUserProxyEnrollment,
  SearchUsers,
  UserSearchRequest
} from '../../app.api/users/app.api.users'
import { calculatePagingLinks } from '../../entities/entities.global'
import { UserIcon, UserIconType } from '../../entities/users/entities.users'
import env from '../../environment/env'
import { Upload } from '../../upload'
import { WebAppRequestFactory } from '../adapters.controllers.web'
import { invalidInputErrorForZodError } from '../adapters.dto.zod'

export interface UsersAppLayer {
  searchUsers: SearchUsers
  enrollLocalUserByProxy: EnrollLocalUserByProxy
}

const UserIconFormSchema = zod.object({
  type: zod.enum(['upload', 'create']).default('upload'),
  text: zod.string().trim(),
  color: zod.string().optional(),
})

const UserAccountFormSchema = zod.object({
  username: zod.string().trim().nonempty(),
  password: zod.string().nonempty(),
  displayName: zod.string().optional(),
  email: zod.email().optional(),
  // TODO: test this for existing phone numbers
  phone: zod.e164().optional(),
  iconMetadata: zod.union(
    [
      zod.object({}),
      zod.string().transform((input, ctx) => {
        try {
          return JSON.parse(input)
        }
        catch (err) {
          ctx.addIssue({ code: 'custom', message: 'invalid JSON' })
        }
      })
    ]
  )
    .optional()
    .pipe(UserIconFormSchema),
  roleId: zod.string().trim().nonempty(),
})

type UserAccountForm = zod.infer<typeof UserAccountFormSchema>

function parseAccountFormFromBody(body: any): UserAccountForm | InvalidInputError {
  const parsedAccount = UserAccountFormSchema.safeParse(body)
  if (parsedAccount.success) {
    return parsedAccount.data
  }
  return invalidInputErrorForZodError(parsedAccount.error)
}

/**
 * This middleware must occur immediately after the Multer upload middleware. Otherwise, a size-limit
 * rejection passes through to express.ts's generic 500 error response middleware.
 */
function handleUserContentUploadError(err: any, req: express.Request, res: express.Response, next: express.NextFunction): any {
  // Captures file-size errors as 400, all other errors are defaulted to 500
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).send(`avatar/icon upload exceeds maximum size of ${env.userContentMaxSize} bytes`);
  }
  next(err)
}

type UploadedIcon = {
  fields: Pick<UserIcon, 'type' | 'text' | 'color'>
  file?: Express.Multer.File
}

function parseIconUpload(req: express.Request): UploadedIcon | null | InvalidInputError {
  let iconMetadata: UserIcon = req.body.iconMetadata || {};
  if (typeof iconMetadata === 'string') {
    iconMetadata = JSON.parse(iconMetadata)
  }
  const files = req.files as Record<string, Express.Multer.File[]>
  const [iconFile] = files.icon || []
  if (iconFile) {
    // default type to upload
    if (!iconMetadata.type) {
      iconMetadata.type = UserIconType.Upload
    }
    if (iconMetadata.type !== UserIconType.Create && iconMetadata.type !== UserIconType.Upload) {
      return invalidInput('invalid icon metadata')
    }
    return {
      fields: {
        type: iconMetadata.type,
        text: iconMetadata.text,
        color: iconMetadata.color,
      },
      file: iconFile,
    }
  }
  return {
    fields: {
      type: UserIconType.None
    }
  }
}

export type UsersRoutesOptions = {
  /**
   * Limit the size of uploaded user avatar and map icon images.
   */
  userContentMaxSize?: number
}

export const defaultUsersRoutesOptions = Object.freeze({
  /**
   * Default to 1 MB upload size limit for icon and avatar images.
   */
  userContentMaxSize: 1024 * 1024
} as const satisfies UsersRoutesOptions)

export function UsersRoutes(
  app: UsersAppLayer, createAppRequest: WebAppRequestFactory,
  opts: UsersRoutesOptions = defaultUsersRoutesOptions): express.Router {

  const routes = express.Router()
  /**
   * Use a Multer instance with the user content upload limit.
   * TODO: inject this setting instead of reading env directly
   */
  const userContentUpload = Upload({ fileSize: opts.userContentMaxSize });

  routes.route('/')
    .post(
      async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> => {
        const accountSpec = parseAccountFormFromBody(req.body)
        if (accountSpec instanceof Error) {
          return next(accountSpec)
        }
        const enrollment: LocalUserProxyEnrollment = {
          username: accountSpec.username,
          roleId: accountSpec.roleId,
          displayName: accountSpec.displayName || accountSpec.username,
          email: accountSpec.email,
          phone: accountSpec.phone,
          password: accountSpec.password,
        }
        const appReq: EnrollLocalUserByProxyRequest = createAppRequest(req, { enrollment })
        const appRes = await app.enrollLocalUserByProxy(appReq)
        if (appRes.error) {
          return next(appRes.error)
        }
        const account = appRes.success
        return res.json(account)
      }
    )

  routes.route('/search')
    .get(async (req, res, next) => {
      const userSearch: UserSearchRequest['userSearch'] = {
        nameOrContactTerm: req.query.term as string | undefined,
        pageSize: parseInt(String(req.query.page_size)) || 250,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: typeof req.query.total === 'string' ? 'true' === String(req.query.total).toLowerCase() : undefined,
        active: typeof req.query.active === 'string' ? 'true' === String(req.query.active).toLowerCase() : undefined,
        enabled: typeof req.query.enabled === 'string' ? 'true' === String(req.query.enabled).toLowerCase() : undefined
      }
      const appReq = createAppRequest(req, { userSearch })
      const appRes = await app.searchUsers(appReq)
      if (appRes.success) {
        const links = calculatePagingLinks(
          { pageSize: userSearch.pageSize, pageIndex: userSearch.pageIndex },
          appRes.success.totalCount
        )
        const responseWithLinks = { ...appRes.success, links }
        return res.json(responseWithLinks);
      }
      next(appRes.error)
    })

  return routes
}
