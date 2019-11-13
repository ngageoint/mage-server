import express, { Router } from 'express';
import PluginService from '../api/plugins';
import { IPluginDescriptor } from '../models/plugin';



declare global {
  namespace Express {
    interface Request {
      pluginDescriptor: IPluginDescriptor | undefined
    }
  }
}

export = function(app: express.Application,  security: any) {

};

function createRoutes(pluginService: PluginService): express.Router {

  const pluginRouters = new Map<string, Router>();
  const router = express.Router();

  router.use(async (req, res, next) => {
    if (req.params.pluginId) {
      const desc = await pluginService.getPlugin(req.params.pluginId as string);
      req.pluginDescriptor = desc;
    }
  });

  router.get('/plugins', async (req, res) => {
    const descriptors = await pluginService.getPlugins();
    const sorted = Array.from(descriptors.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    return res.json(sorted);
  });

  router.put('/:pluginId/enabled', async (req, res) => {
    const pluginId = req.params.pluginId as string;
    const desc = await pluginService.getPlugin(pluginId);
    if (!desc) {
      return res.status(404).send('not found');
    }
    pluginService.enablePlugin(desc);
  });

  router.all('/:pluginId/*', async (req, res, next) => {
    const desc = req.pluginDescriptor;
    if (!desc) {
      return res.status(404).send('not found');
    }
    const pluginRoutes = pluginRouters.get(desc.pluginId);
    if (!pluginRoutes) {
      const err = new Error(`no routes exist for plugin ${desc.pluginId}`);
      console.log(err);
      return next(err);
    }
    return pluginRoutes(req, res, next);
  });

  return router;
};