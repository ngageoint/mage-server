
import { Request, Response, NextFunction, Application, Router, ErrorRequestHandler, Handler, RequestParamHandler, RequestHandler } from 'express'
import path from 'path'
import OpenapiEnforcerMiddleware, { MiddlewareFunction } from 'openapi-enforcer-middleware'
import { SourceRepository, AdapterRepository } from './repositories'
import { ManifoldService } from './services'
import OgcApiFeatures from './ogcapi-features'
import { SourceDescriptorEntity } from './models'
import OpenApiEnforcerMiddleware from 'openapi-enforcer-middleware'
const log = require('../../logger')

declare global {
  namespace Express {
    interface Request {
      manifold: {
        contextSource?: SourceDescriptorEntity
        adapter?: OgcApiFeatures.ServiceAdapter
      }
    }
  }
}

export type ManifoldController = {
  getManifoldDescriptor(req: Request, res: Response, next: NextFunction): Promise<Response>
  createSource(req: Request, res: Response, next: NextFunction): Promise<Response>
  getSource(req: Request, res: Response, next: NextFunction): Promise<Response>
  getSourceApi(req: Request, res: Response, next: NextFunction): Promise<Response>
}

export namespace ManifoldController {
  export type Injection = {
    adapterRepo: AdapterRepository,
    sourceRepo: SourceRepository,
    manifoldService: ManifoldService
  }
}


export function createRouter(injection: ManifoldController.Injection): Router {
  const enforcer = loadManifoldApi(injection)
  const setContextSource = contextSourceParamHandler(injection)
  // this is a way to force middleware to run on the enforcer middleware
  // before getting to the actual controller
  // const enforcerMiddlewares = (enforcer as any).options.middleware as any[]
  // const m = function(req: object, res: object, next: (err?: any) => void): void {
  //   log.debug(`in enforcer for ${(req as any)['path']}`)
  //   next()
  // }
  // enforcerMiddlewares.unshift(m)
  const mainRoutes = enforcer.middleware()
  const root = Router()
  root.use((req, res, next) => {
    req.manifold = {}
    next()
  })
  root.use('/sources/:sourceId', setContextSource)
  root.use('/sources/:sourceId/', sourceRouter)
  root.use(mainRoutes)
  return root
}

function loadManifoldApi(injection: ManifoldController.Injection): OpenApiEnforcerMiddleware {
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
  return enforcer
}

function manifoldController(injection: ManifoldController.Injection): ManifoldController {
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

    async getSource(req: Request, res: Response, next: NextFunction): Promise<Response> {
      if (!req.manifold.contextSource) {
        return res.status(404).json('not found')
      }
      return res.send(req.manifold.contextSource.toJSON())
    },

    async getSourceApi(req: Request, res: Response, next: NextFunction): Promise<Response> {
      return res.send({})
    }
  }
}

function contextSourceParamHandler(injection: ManifoldController.Injection): RequestHandler {
  const { sourceRepo, manifoldService } = injection
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.hasOwnProperty('sourceId')) {
      return next()
    }
    const sourceId = req.params.sourceId
    const sourceDesc = sourceId ? await sourceRepo.findById(sourceId) : null
    if (sourceDesc === null) {
      return res.status(404).json('not found')
    }
    req.manifold.contextSource = sourceDesc
    const adapter = await manifoldService.getAdapterForSource(sourceDesc)
    req.manifold.adapter = adapter
    next()
  }
}

const sourceRouter = Router()
sourceRouter.route('/conformance')
sourceRouter.route('/collections')
sourceRouter.route('/collections/:collectionId')
  .get(async (req, res, next) => {
    const adapter = req.manifold.adapter
    if (!adapter) {
      return next(new Error(`no adapter on request ${req.path}`))
    }
    const collectionId = req.params.collectionId as string
    const collections = await adapter.getCollections()
    const collectionDesc = collections.get(collectionId)
    return res.json(collectionDesc)
  })
sourceRouter.route('/collections/:collectionId/items')
sourceRouter.route('/collections/:collectionId/items/:featureId')

export default function initialize(app: Application, callback: (err?: Error | null) => void) {
  const adapterRepo = new AdapterRepository()
  const sourceRepo = new SourceRepository()
  const manifoldService = new ManifoldService(adapterRepo, sourceRepo)
  const injection = { adapterRepo, sourceRepo, manifoldService }
  // TODO: instead make plugins return a Router that the app can mount
  const router = createRouter(injection)
  app.use('/plugins/manifold', router)
  setImmediate(() => callback())
}
