'use strict';

/** Public documentation and private event documentation use separate settings. */
module.exports = function(app, security, dependencies = {}) {
  const guides = dependencies.guides || require('../models/guide-customization').repository();
  const Event = dependencies.Event || require('../models/event');
  const permissions = dependencies.permissions || require('../permissions/permissions.events').defaultEventPermissionsService;
  const images = dependencies.images || require('../models/guide-images').imageStore(
    require('path').join(require('../environment/env').attachmentBaseDirectory, 'user-guide-images'));
  const authenticate = security.authentication.bearerAuthentication;
  const noCache = (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
  const admin = (req, res, next) => {
    const role = req.user?.roleId;
    if (!['ADMIN_ROLE', 'EVENT_MANAGER_ROLE'].includes(role?.name) ||
        !role?.permissions?.includes('UPDATE_SETTINGS')) return res.sendStatus(403);
    next();
  };
  const eventAccess = (req, res, next) => {
    if (!/^[0-9]+$/.test(req.params.guideEventId)) return res.sendStatus(400);
    Event.getById(req.params.guideEventId, { populate: false }, (err, event) => {
      if (err) return next(err);
      if (!event) return res.sendStatus(404);
      permissions.authorizeEventAccess(event, req.user, 'READ_EVENT_ALL', 'read')
        .then(denied => denied ? res.sendStatus(403) : next()).catch(next);
    });
  };
  const read = type => (req, res, next) => guides.get(type(req)).then(state => res.json(state)).catch(next);
  const imageScope = req => req.params.guideEventId ? `event-${req.params.guideEventId}` : 'global';
  const write = type => async (req, res, next) => {
    try {
      const state = require('../models/guide-customization').validateState(req.body);
      for (const edit of Object.values(state.overrides)) {
        for (const image of edit.images || []) if (image.assetId) await images.read(imageScope(req), image.assetId);
      }
      res.json(await guides.save(type(req), state));
    } catch (err) { next(err); }
  };
  const globalType = () => 'user-guide-global';
  const eventType = req => `user-guide-event-${req.params.guideEventId}`;

  app.get('/api/user-guide/customizations', noCache, read(globalType));
  app.put('/api/user-guide/customizations', noCache, authenticate, admin, write(globalType));
  app.get('/api/user-guide/events/:guideEventId', noCache, authenticate, eventAccess, read(eventType));
  app.put('/api/user-guide/events/:guideEventId', noCache, authenticate, admin, eventAccess, write(eventType));
  const upload = (req, res, next) => images.upload(imageScope(req), req.body?.dataUrl)
    .then(image => res.status(201).json(image)).catch(next);
  const serve = type => async (req, res, next) => {
    try {
      const state = await guides.get(type(req));
      const published = Object.values(state.overrides).some(edit =>
        (edit.images || []).some(image => image.assetId === req.params.imageId));
      if (!published) return res.sendStatus(404);
      res.type('png').set('X-Content-Type-Options', 'nosniff').send(await images.read(imageScope(req), req.params.imageId));
    } catch (err) { next(err); }
  };
  app.post('/api/user-guide/customizations/images', noCache, authenticate, admin, upload);
  app.get('/api/user-guide/customizations/images/:imageId', noCache, serve(globalType));
  app.post('/api/user-guide/events/:guideEventId/images', noCache, authenticate, admin, eventAccess, upload);
  app.get('/api/user-guide/events/:guideEventId/images/:imageId', noCache, authenticate, eventAccess, serve(eventType));
};
