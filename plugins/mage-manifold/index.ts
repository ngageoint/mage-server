
import { Request, Response, NextFunction, Application, Router } from 'express'
import path from 'path'
import OpenapiEnforcerMiddleware from 'openapi-enforcer-middleware'
import { SourceRepository, AdapterRepository } from './repositories'
import { ManifoldService } from './services'


export type ManifoldController = {
  getManifoldDescriptor(req: Request, res: Response, next: NextFunction): Promise<Response>
  getSourceApi(req: Request, res: Response, next: NextFunction): Promise<Response>
  createSource(req: Request, res: Response, next: NextFunction): Promise<Response>
}

export namespace ManifoldController {
  export type Injection = {
    adapterRepo: AdapterRepository,
    sourceRepo: SourceRepository,
    manifoldService: ManifoldService
  }
}

export function loadApi(injection: ManifoldController.Injection): Router {
  const apiDocPath = path.resolve(__dirname, 'api_docs', 'openapi.yaml')
  const enforcer = new OpenapiEnforcerMiddleware(apiDocPath, {
    // TODO: validate in test env only
    resValidate: true,
    resSerialize: false,
    componentOptions: {
      exceptionSkipCodes: [ 'WSCH001' ]
    }
  })
  enforcer.controllers({
    manifold: manifoldController(injection)
  })
  const router = Router()
  router.use(enforcer.middleware())
  return router
}

export function manifoldController(injection: ManifoldController.Injection): ManifoldController {
  const { sourceRepo, manifoldService } = injection
  return {
    async getManifoldDescriptor(req: Request, res: Response, next: NextFunction): Promise<Response> {
      const desc = await manifoldService.getManifoldDescriptor()
      return res.send(desc)
    },

    async createSource(req: Request, res: Response, next: NextFunction): Promise<Response> {
      const created = await sourceRepo.create(req.body)
      return res.status(201).location(`${req.baseUrl}/sources/${created.id}`).send(created.toJSON())
    },

    async getSourceApi(req: Request, res: Response, next: NextFunction): Promise<Response> {
      return res.send({})
    }
  }
}

export default function initialize(app: Application, callback: (err?: Error | null) => void) {
  const adapterRepo = new AdapterRepository()
  const sourceRepo = new SourceRepository()
  const manifoldService = new ManifoldService(adapterRepo, sourceRepo)
  const enforcer = loadApi({ adapterRepo, sourceRepo, manifoldService })
  // TODO: instead make plugins return a Router that the app can mount
  app.use('/plugins/manifold/api', enforcer)
  setImmediate(() => callback())
}
