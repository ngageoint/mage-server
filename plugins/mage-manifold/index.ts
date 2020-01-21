
import { Request, Response, NextFunction, Application } from 'express'
import path from 'path'
import OpenapiEnforcerMiddleware from 'openapi-enforcer-middleware'
import { SourceRepository, AdapterRepository } from './repositories'
import log from  '../../logger'
import { ManifoldService, ManifoldDescriptor } from './services'
import { AdapterDescriptor, SourceDescriptor } from './models'


export type ManifoldController = {

  getManifoldDescriptor(req: Request, res: Response, next: NextFunction): Promise<Response>
  getAdapters(req: Request, res: Response, next: NextFunction): Promise<Response>
  getSources(req: Request, res: Response, next: NextFunction): Promise<Response>
  getSourceApi(req: Request, res: Response, next: NextFunction): Promise<Response>
  createAdapter(req: Request, res: Response, next: NextFunction): Promise<Response>
  createSource(req: Request, res: Response, next: NextFunction): Promise<Response>
}

export namespace ManifoldController {

  export type Injection = {
    adapterRepo: AdapterRepository,
    sourceRepo: SourceRepository,
    manifoldService: ManifoldService
  }
}

export function loadApi(injection: ManifoldController.Injection): OpenapiEnforcerMiddleware {
  const apiDocPath = path.resolve(__dirname, 'api_docs', 'openapi.yaml')
  const enforcer = new OpenapiEnforcerMiddleware(apiDocPath, {
    componentOptions: {
      exceptionSkipCodes: [ 'WSCH001' ]
    }
  })
  enforcer.controllers({
    manifold: manifoldController(injection)
  })
  return enforcer
}

export function manifoldController(injection: ManifoldController.Injection): ManifoldController {
  const { adapterRepo, sourceRepo, manifoldService } = injection

  return {

    async getManifoldDescriptor(req: Request, res: Response, next: NextFunction): Promise<Response> {
      const desc = await manifoldService.getManifoldDescriptor()
      return res.send(desc)
    },

    async getSources(req: Request, res: Response, next: NextFunction): Promise<Response> {
      const sources = await sourceRepo.readAll()
      return res.send(sources.map(x => x.toJSON()))
    },

    async getAdapters(req: Request, res: Response, next: NextFunction): Promise<Response> {
      const adapters = await adapterRepo.readAll()
      return res.send(adapters)
    },

    async createAdapter(req, res, next): Promise<Response> {
      throw Error('unimplemented')
    },

    async createSource(req: Request, res: Response, next: NextFunction): Promise<Response> {
      throw Error('unimplemented')
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
  app.use('/plugins/manifold/api/*', enforcer.middleware)
  setImmediate(() => callback())
}
