import moment from 'moment'
import path from 'path'
import express from 'express'
import fs from 'fs'
import log from '../logger'
import { exportDirectory } from '../environment/env'
import Event, { MageEventDocument } from '../models/event'
import access from '../access'
import exportXform from '../transformers/export'
import { exportFactory, ExportFormat } from '../export'
import { defaultEventPermissionsService as eventPermissions } from '../permissions/permissions.events'
import { MageRouteDefinitions } from './routes.types'
import { ExportPermission, ObservationPermission } from '../entities/authorization/entities.permissions'
import { EventAccessType } from '../entities/events/entities.events'
import Export, { ExportDocument } from '../models/export'

type ExportRequest = express.Request & {
    export?: ExportDocument | null
    parameters?: {
      exportId?: ExportDocument['_id']
      filter: any
    },
}

const DefineExportsRoutes: MageRouteDefinitions = function(app, security) {

  const passport = security.authentication.passport;

  async function authorizeEventAccess(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    if (access.userHasPermission(req.user, ObservationPermission.READ_OBSERVATION_ALL)) {
      return next();
    }
    else if (access.userHasPermission(req.user, ObservationPermission.READ_OBSERVATION_EVENT)) {
      // Make sure I am part of this event
      const allowed = await eventPermissions.userHasEventPermission(req.event!, req.user.id, EventAccessType.Read)
      if (allowed) {
        return next();
      }
    }
    res.sendStatus(403);
  }

  function authorizeExportAccess(permission: ExportPermission): express.RequestHandler {
    return async function authorizeExportAccess(req, res, next) {
      const exportReq = req as ExportRequest
      exportReq.export = await Export.getExportById(req.params.exportId)
      if (access.userHasPermission(exportReq.user, permission)) {
        next()
      }
      else {
        exportReq.user._id.toString() === exportReq.export?.userId.toString() ? next() : res.sendStatus(403);
      }
    }
  }

  app.post('/api/exports',
    passport.authenticate('bearer'),
    parseQueryParams,
    getEvent,
    authorizeEventAccess,
    function (req, res, next) {
      const exportReq = req as ExportRequest
      const document = {
        userId: exportReq.user._id,
        exportType: exportReq.body.exportType,
        options: {
          eventId: req.body.eventId,
          filter: exportReq.parameters!.filter
        }
      }
      Export.createExport(document).then(result => {
        const response = exportXform.transform(result, { path: req.getPath() });
        res.location(`${req.route.path}/${result._id.toString()}`).status(201).json(response);
        exportData(result._id, exportReq.event!);
      })
      .catch(err => next(err))
    }
  )

  /**
   * Get all exports
   */
  app.get('/api/exports',
    passport.authenticate('bearer'),
    access.authorize(ExportPermission.READ_EXPORT),
    function (req, res, next) {
      Export.getExports().then(results => {
        const response = exportXform.transform(results, { path: req.getPath() });
        res.json(response);
      }).catch(err => next(err));
    }
  )

  /**
   * Get my exports
   */
  app.get('/api/exports/myself',
    passport.authenticate('bearer'),
    function (req, res, next) {
      Export.getExportsByUserId(req.user._id, { populate: true }).then(exports => {
        const response = exportXform.transform(exports, { path: `${req.getRoot()}/api/exports` });
        res.json(response);
      }).catch(err => next(err));
    }
  )

  /**
  * Get a specific export
  */
  app.get('/api/exports/:exportId',
    passport.authenticate('bearer'),
    authorizeExportAccess(ExportPermission.READ_EXPORT),
    function (req, res) {
      const exportReq = req as ExportRequest
      const file = path.join(exportDirectory, exportReq.export!.relativePath!);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${exportReq.export!.filename}`
      });
      const readStream = fs.createReadStream(file);
      readStream.pipe(res);
    })

  /**
   * Remove a specific export
   */
  // TODO should be able to delete your own export
  app.delete('/api/exports/:exportId',
    passport.authenticate('bearer'),
    authorizeExportAccess(ExportPermission.DELETE_EXPORT),
    function (req, res, next) {
      const exportId = req.params.exportId
      Export.removeExport(req.params.exportId)
        .then(result => {
          if (!result) {
            return res.status(404).json({ message: `No export exists for ID ${exportId}` })
          }
          if (result.relativePath) {
            fs.promises.unlink(path.join(exportDirectory, result.relativePath)).catch(err => {
              log.warn(`error removing export file, ${result.relativePath}`, err)
            })
          }
          res.json(result);
        })
        .catch(err => next(err));
    });

  /**
   * Retry a failed export
   */
  app.post('/api/exports/:exportId/retry',
    passport.authenticate('bearer'),
    authorizeExportAccess(ExportPermission.READ_EXPORT),
    getExport,
    getEvent,
    authorizeEventAccess,
    function (req, res) {
      const exportId = req.params.exportId
      res.json({ id: exportId })
      exportData(exportId, req.event!)
    })
}

/*
TODO: This should not be using middleware to parse query parameters and find the
event and add those keys to the incoming request object.  Just do those things
in the actual request handler.
*/

function getExport(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const exportId = req.params.exportId
  if (!exportId) {
    return void(res.status(400).json({ message: `exportId is required`}))
  }
  Export.getExportById(exportId)
    .then(result => {
      if (!result) {
        return void(res.status(404).json({ message: `No export exists for ID ${exportId}`}))
      }
      const exportReq = req as ExportRequest
      const parameters = { filter: {} } as Required<ExportRequest>['parameters']
      parameters.filter.eventId = result.options.eventId;
      parameters.exportId = result._id;
      exportReq.parameters = parameters;
      next();
    })
    .catch(err => next(err));
}

function parseQueryParams(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const parameters = { filter: {} } as any;
  const body = req.body || {};
  // TODO: check dates are valid
  const startDate = body.startDate;
  if (startDate) {
    parameters.filter.startDate = moment.utc(startDate).toDate();
  }
  const endDate = body.endDate;
  if (endDate) {
    parameters.filter.endDate = moment.utc(endDate).toDate();
  }
  const eventId = body.eventId;
  if (!eventId) {
    return void(res.status(400).send("eventId is required"))
  }
  parameters.filter.eventId = eventId;
  parameters.filter.exportObservations = String(body.observations).toLowerCase() === 'true';
  if (parameters.filter.exportObservations) {
    parameters.filter.favorites = String(body.favorites).toLowerCase() === 'true';
    if (parameters.filter.favorites) {
      parameters.filter.favorites = {
        userId: req.user._id
      };
    }
    parameters.filter.important = String(body.important).toLowerCase() === 'true';
    parameters.filter.attachments = String(body.attachments).toLowerCase() === 'true';
  }
  parameters.filter.exportLocations = String(body.locations).toLowerCase() === 'true';
  req.parameters = parameters;
  next();
}

function getEvent(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const exportReq = req as ExportRequest
  if (!exportReq.parameters?.filter) {
    return void(res.status(400).send('eventId is required'))
  }
  const { eventId } = exportReq.parameters.filter
  Event.getById(eventId, {}, function (err, event) {
    if (err || !event) {
      return res.status(400).send(`Event with ID ${eventId} does not exist.`)
    }
    req.event = event
    next()
  })
}

async function exportData(exportId: ExportDocument['_id'], event: MageEventDocument): Promise<void> {
  let exportDocument = await Export.updateExport(exportId, { status: Export.ExportStatus.Running })
  if (!exportDocument) {
    return
  }
  const options = {
    event: event,
    filter: exportDocument.options.filter
  };
  const exporter = exportFactory.createExportTransform(exportDocument.exportType.toLowerCase() as ExportFormat, options);
  if (!exporter) {
    return
  }
  const filename = exportId + '-' + exportDocument.exportType + '.zip';
  exportDocument = (await Export.updateExport(exportId, {
    status: Export.ExportStatus.Running,
    relativePath: filename,
    filename: filename
  }))!
  const file = path.join(exportDirectory, filename);
  const stream = fs.createWriteStream(file);
  stream.on('finish', () => {
    log.info(`finished export ${exportId} @ ${file}`);
    Export.updateExport(exportId, { status: Export.ExportStatus.Completed });
  });
  log.info('begin export\n', exportDocument.toJSON());
  try {
    await exporter.export(stream);
  } catch (e) {
    log.error(`Error exporting ${exportId}`, e);
    Export.updateExport(exportId, { status: Export.ExportStatus.Failed }).catch(err => {
      log.warn(`Failed to update export ${exportId} to failed state`, err);
    });
  }
}

export = DefineExportsRoutes
