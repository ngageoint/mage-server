import express from 'express'
import zod from 'zod'
import { WebAppRequestFactory } from '../adapters/adapters.controllers.web'
import { invalidInputErrorForZodError } from '../adapters/adapters.dto.zod'
import { InvalidInputError } from '../app.api/app.api.errors'
import { EnrollLocalUserByProxy, EnrollLocalUserByProxyRequest, LocalUserProxyEnrollmentAccount } from './ingress.enrollment.app.api'

export type EnrollmentAppLayer = {
  enrollLocalUserByProxy: EnrollLocalUserByProxy
}

const UserProxyEnrollmentFormSchema = zod.object({
  username: zod.string().trim().nonempty(),
  password: zod.string().nonempty(),
  displayName: zod.string().optional(),
  email: zod.email().optional(),
  // TODO: test this for existing phone numbers
  phone: zod.e164().optional(),
  roleId: zod.string().trim().nonempty(),
})

type UserAccountForm = zod.infer<typeof UserProxyEnrollmentFormSchema>

function parseEnrollmentFormFromBody(body: any): UserAccountForm | InvalidInputError {
  const parsedAccount = UserProxyEnrollmentFormSchema.safeParse(body)
  if (parsedAccount.success) {
    return parsedAccount.data
  }
  return invalidInputErrorForZodError(parsedAccount.error)
}

export function EnrollmentRoutes(
  app: EnrollmentAppLayer, createAppRequest: WebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/')
    .post(
      async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> => {
        const accountSpec = parseEnrollmentFormFromBody(req.body)
        if (accountSpec instanceof Error) {
          return next(accountSpec)
        }
        const enrollment: LocalUserProxyEnrollmentAccount = {
          username: accountSpec.username,
          roleId: accountSpec.roleId,
          displayName: accountSpec.displayName || accountSpec.username,
          email: accountSpec.email,
          phone: accountSpec.phone,
          password: accountSpec.password,
        }
        const appReq: EnrollLocalUserByProxyRequest = createAppRequest(req, { account: enrollment })
        const appRes = await app.enrollLocalUserByProxy(appReq)
        if (appRes.error) {
          return next(appRes.error)
        }
        const account = appRes.success
        return res.json(account)
      }
    )

  return routes
}
