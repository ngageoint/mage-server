import express, { Router } from 'express';
import { PluginService, PluginDescriptor } from '../api/plugins';



declare global {
  namespace Express {
    interface Request {
      pluginDescriptor: PluginDescriptor | undefined
    }
  }
}

export = function initialize(app: express.Application, security: any) {

};

async function initializeRoutes(pluginService: PluginService): Promise<express.Router> {

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
    return res.json(descriptors.values());
  });

  router.put('/:pluginId/enabled', async (req, res) => {
    const pluginId = req.params.pluginId as string;
    const desc = await pluginService.getPlugin(pluginId);
    if (!desc) {
      return res.status(404).send('not found');
    }
    const enable = req.body as boolean;
    if (typeof enable !== 'boolean') {
      return res.status(400).send('request body must be boolean');
    }
    if (enable === desc.enabled) {
      return res.status(200).json(desc);
    }
    let updated: PluginDescriptor = desc;
    if (enable === true) {
      updated = await pluginService.enablePlugin(desc);
    }
    else if (enable === false) {
      updated = await pluginService.disablePlugin(desc);
    }
    return res.json(updated);
  });

  router.all('/:pluginId/*', async (req, res, next) => {
    const desc = req.pluginDescriptor;
    if (!desc) {
      return res.status(404).send('not found');
    }
    const pluginRoutes = pluginRouters.get(desc.id);
    if (!pluginRoutes) {
      const err = new Error(`no routes exist for plugin ${desc.id}`);
      console.log(err);
      return next(err);
    }
    return pluginRoutes(req, res, next);
  });

  return Promise.resolve(router);
};