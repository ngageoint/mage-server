
import { Request, Response, NextFunction, Application } from 'express';
import path from 'path';
import OpenapiEnforcerMiddleware from 'openapi-enforcer-middleware';
import { SourceRepository, AdapterRepository } from './repositories';
import log from  '../../logger'


export type ManifoldController = {

  getAdapters(req: Request, res: Response, next: NextFunction): Promise<Response>
  getSources(req: Request, res: Response, next: NextFunction): Promise<Response>
  getSourceApi(req: Request, res: Response, next: NextFunction): Promise<Response>
}

export namespace ManifoldController {

  export type Injection = {
    adapterRepo: AdapterRepository,
    sourceRepo: SourceRepository,
  }
}

export function loadApi(injection: ManifoldController.Injection): OpenapiEnforcerMiddleware {
  const apiDocPath = path.resolve(__dirname, 'api_docs', 'openapi.yaml');
  const enforcer = new OpenapiEnforcerMiddleware(apiDocPath, {
    componentOptions: {
      exceptionSkipCodes: ['WSCH001']
    }
  });
  enforcer.controllers({
    manifold: manifoldController(injection)
  });
  return enforcer;
}

export function manifoldController(injection: ManifoldController.Injection): ManifoldController {
  const { adapterRepo, sourceRepo } = injection;

  return {
    async getSources(req: Request, res: Response, next: NextFunction): Promise<Response> {
      let sources = await sourceRepo.readAll();
      return res.send(sources.map(x => x.toJSON()));
    },

    async getAdapters(req: Request, res: Response, next: NextFunction): Promise<Response> {
      let adapters = await adapterRepo.readAll();
      return res.send(adapters);
    },

    async getSourceApi(req: Request, res: Response, next: NextFunction): Promise<Response> {
      return res.send({});
    }
  }
}

export default function initialize(app: Application, callback: (err?: Error | null) => void) {
  const adapterRepo = new AdapterRepository();
  const sourceRepo = new SourceRepository();
  const enforcer = loadApi({ adapterRepo, sourceRepo });
  app.use('/plugins/manifold/api/*', enforcer.middleware);
  setImmediate(() => callback());
};
