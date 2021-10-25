const moment = require('moment')
  , path = require('path')
  , log = require('winston')
  , fs = require('fs')
  , exportDirectory = require('../environment/env').exportDirectory
  , Event = require('../models/event')
  , User = require('../models/user')
  , Device = require('../models/device')
  , access = require('../access')
  , exportXform = require('../transformers/export')
  , exporterFactory = require('../export/exporterFactory')
  , Export = require('../models/export');

module.exports = function (app, security) {

  const passport = security.authentication.passport;

  function authorizeEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_OBSERVATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_OBSERVATION_EVENT')) {
      // Make sure I am part of this event
      Event.userHasEventPermission(req.event, req.user._id, 'read', function (err, hasPermission) {
        if (hasPermission) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function authorizeExportAccess(permission) {
    return async function authorizeExportAccess(req, res, next) {
      req.export = await Export.getExportById(req.params.exportId);
      if (access.userHasPermission(req.user, permission)) {
        next();
      } else {
        req.user._id.toString() === req.export.userId.toString() ? next() : res.sendStatus(403);
      }
    }
  }

  app.post('/api/exports',
    passport.authenticate('bearer'),
    parseQueryParams,
    getEvent,
    authorizeEventAccess,
    mapUsers,
    mapDevices,
    function (req, res, next) {
      const document = {
        userId: req.user._id,
        exportType: req.body.exportType,
        options: {
          eventId: req.body.eventId,
          filter: req.parameters.filter
        }
      };

      Export.createExport(document).then(result => {
        const response = exportXform.transform(result, { path: req.getPath() });
        res.location(`${req.route.path}/${result._id.toString()}`).status(201).json(response);

        //TODO figure out event, users and devices
        exportData(result._id, req.event, req.users, req.devices).catch(err => {
          log.error(`Error exporting ${result._id}`, err);
          Export.updateExport(result._id, {status: Export.ExportStatus.Failed});
        });
      }).catch(err => next(err));
    }
  );

  /**
   * Get all exports
   */
  app.get('/api/exports',
    passport.authenticate('bearer'),
    access.authorize('READ_EXPORT'),
    function (req, res, next) {
      Export.getAllExports().then(results => {
        const response = exportXform.transform(results, { path: req.getPath() });
        res.json(response);
      }).catch(err => next(err));
    }
  );

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
  );

  /**
  * Get a specific export
  */
  app.get('/api/exports/:exportId',
    passport.authenticate('bearer'),
    authorizeExportAccess('READ_EXPORT'),
    function (req, res) {
      const file = path.join(exportDirectory, req.export.relativePath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${req.export.filename}`
      });
      const readStream = fs.createReadStream(file);
      readStream.pipe(res);
    });

  /**
   * Remove a specific export
   */
  // TODO should be able to delete your own export
  app.delete('/api/exports/:exportId',
    passport.authenticate('bearer'),
    authorizeExportAccess('DELETE_EXPORT'),
    function (req, res, next) {
      Export.removeExport(req.params.exportId).then(result => {
        fs.promises.unlink(path.join(exportDirectory, result.relativePath)).catch(err => {
          log.warn(`Error removing export file, ${result.relativePath}`, err)
        })
        res.json(result);
      }).catch(err => next(err));
    });

  /**
   * Retry a failed export
   */
  app.post('/api/exports/:exportId/retry',
    passport.authenticate('bearer'),
    authorizeExportAccess('READ_EXPORT'),
    getExport,
    getEvent,
    authorizeEventAccess,
    mapUsers,
    mapDevices,
    function (req, res) {
      res.json({ id: req.params.exportId });

      exportData(req.param('exportId'), req.event, req.users, req.devices).catch(err => {
        log.error(err);
      });
    });
};

function getExport(req, res, next) {
  Export.getExportById(req.params.exportId).then(result => {
    const parameters = { filter: {} };

    parameters.filter.eventId = result.options.eventId;
    parameters.exportId = result._id;

    req.parameters = parameters;

    next();
  }).catch(err => next(err));
}

function parseQueryParams(req, res, next) {
  const parameters = { filter: {} };

  const startDate = req.param('startDate');
  if (startDate) {
    parameters.filter.startDate = moment.utc(startDate).toDate();
  }

  const endDate = req.param('endDate');
  if (endDate) {
    parameters.filter.endDate = moment.utc(endDate).toDate();
  }

  const eventId = req.param('eventId');
  if (!eventId) {
    return res.status(400).send("eventId is required");
  }
  parameters.filter.eventId = eventId;

  parameters.filter.exportObservations = String(req.param('observations')).toLowerCase() === 'true';
  if (parameters.filter.exportObservations) {
    parameters.filter.favorites = String(req.param('favorites')).toLowerCase() === 'true';
    if (parameters.filter.favorites) {
      parameters.filter.favorites = {
        userId: req.user._id
      };
    }

    parameters.filter.important = String(req.param('important')).toLowerCase() === 'true';
    parameters.filter.attachments = String(req.param('attachments')).toLowerCase() === 'true';
  }

  parameters.filter.exportLocations = String(req.param('locations')).toLowerCase() === 'true';

  req.parameters = parameters;

  next();
}

function getEvent(req, res, next) {
  Event.getById(req.parameters.filter.eventId, {}, function (err, event) {
    if (err || !event) {
      const msg = "Event with id " + req.parameters.filter.eventId + " does not exist";
      return res.status(400).send(msg);
    }

    req.event = event;

    // form map
    event.formMap = {};

    // field by name map
    event.forms.forEach(function (form) {
      event.formMap[form.id] = form;

      const fieldNameToField = {};
      form.fields.forEach(function (field) {
        fieldNameToField[field.name] = field;
      });

      form.fieldNameToField = fieldNameToField;
    });

    next(err);
  });
}

function mapUsers(req, res, next) {
  //get users for lookup
  User.getUsers(function (err, users) {
    if (err) return next(err);

    const map = {};
    users.forEach(function (user) {
      map[user._id] = user;
    });
    req.users = map;

    next();
  });
}

function mapDevices(req, res, next) {
  //get users for lookup
  Device.getDevices()
    .then(devices => {
      const map = {};
      devices.forEach(function (device) {
        map[device._id] = device;
      });
      req.devices = map;
      next();
    })
    .catch(err => next(err));
}

async function exportData(exportId, event, users, devices) {
  let exportDocument = await Export.updateExport(exportId, { status: Export.ExportStatus.Running })

  const filename = exportId + '-' + exportDocument.exportType + '.zip';
  exportDocument = await Export.updateExport(exportId, {
    status: Export.ExportStatus.Running,
    relativePath: filename,
    filename: filename
  });

  const file = path.join(exportDirectory, filename);
  const stream = fs.createWriteStream(file);
  stream.on('finish', () => {
    log.info('Successfully completed export of ' + exportId);
    Export.updateExport(exportId, { status: Export.ExportStatus.Completed });
  });

  const options = {
    event: event,
    users: users,
    devices: devices,
    filter: exportDocument.options.filter
  };
  log.info('Export ' + exportId + ' (' + exportDocument.exportType + ')');
  const exporter = exporterFactory.createExporter(exportDocument.exportType.toLowerCase(), options);
  exporter.export(stream);
}
