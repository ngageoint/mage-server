'use strict';

const moment = require('moment')
  , log = require('winston')
  , fs = require('fs')
  , Writable = require('stream')
  , exportDirectory = require('../environment/env').exportDirectory
  , Event = require('../models/event')
  , User = require('../models/user')
  , Device = require('../models/device')
  , access = require('../access')
  , exporterFactory = require('../export/exporterFactory')
  , ExportMetadata = require('../models/exportmetadata');


module.exports = function (app, security) {

  const passport = security.authentication.passport;

  /**
   * This method holds up the request until the export is complete.
   * 
   * @deprecated Use {@code /api/exports/} instead.  
   */
  app.get(
    '/api/:exportType(geojson|kml|shapefile|csv)',
    passport.authenticate('bearer'),
    parseQueryParams,
    getEvent,
    validateEventAccess,
    mapUsers,
    mapDevices,
    function (req, res) {
      log.warn('DEPRECATED - /api/:exportType called.  Please use /api/exports instead.');

      const options = {
        event: req.event,
        users: req.users,
        devices: req.devices,
        filter: req.parameters.filter
      };
      const exporter = exporterFactory.createExporter(req.params.exportType, options);
      exporter.export(res);
    }
  );

  /**
   * This performs the export in the "background".  This means that the export does 
   * not hold up the request until the export is complete.
   */
  app.post('/api/exports',
    passport.authenticate('bearer'),
    access.authorize('READ_EXPORT'),
    parseQueryParams,
    getEvent,
    validateEventAccess,
    mapUsers,
    mapDevices,
    function (req, res, next) {

      const meta = {
        userId: req.user._id,
        exportType: req.param('exportType'),
        options: {
          eventId: req.param('eventId'),
          filter: req.parameters.filter
        }
      };

      ExportMetadata.createMetadata(meta).then(result => {
        //TODO figure out event, users and devices
        exportInBackground(result._id, req.event, req.users, req.devices).catch(err => {
          log.warn(err);
        });
        res.location(result.location);
        res.status(201);
        const exportResponse = {
          exportId: result._id.toString()
        };
        res.json(exportResponse);
        return next();
      }).catch(err => {
        log.warn(err);
        return next(err);
      });
    }
  );

  /**
   * Get all exports
   */
  app.get('/api/exports/all',
    passport.authenticate('bearer'),
    access.authorize('READ_EXPORT'),
    function (req, res, next) {
      ExportMetadata.getAllExportMetadatas().then(metas => {
        res.json(metas);
        return next();
      }).catch(err => {
        log.warn(err);
        return next(err);
      });
    }
  );

  /**
   * Get my exports
   */
  app.get('/api/exports/myself',
    passport.authenticate('bearer'),
    access.authorize('READ_EXPORT'),
    function (req, res, next) {
      ExportMetadata.getExportMetadatasByUserId(req.user._id).then(metas => {
        res.json(metas);
        return next();
      }).catch(err => {
        log.warn(err);
        return next(err);
      });
    }
  );

  /**
  * Get a specific export
  */
  app.get('/api/exports/download/:exportId',
    passport.authenticate('bearer'),
    access.authorize('READ_EXPORT'),
    function (req, res, next) {
      ExportMetadata.getExportMetadataById(req.param("exportId")).then(meta => {
        const file = meta.physicalPath;
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": "attachment; filename=" + meta.filename
        });
        const readStream = fs.createReadStream(file);
        readStream.pipe(res);
        return next();
      }).catch(err => {
        return next(err);
      });
    });

  /**
   * Remove a specific export
   */
  app.delete('/api/exports/:exportId',
    passport.authenticate('bearer'),
    access.authorize('DELETE_EXPORT'),
    function (req, res, next) {
      ExportMetadata.removeMetadata(req.param("exportId")).then(meta => {
        fs.unlinkSync(meta.physicalPath);
        res.json(meta);
        return next();
      }).catch(err => {
        return next(err);
      });
    });

  /**
   * Retry a failed export
   */
  app.post('/api/exports/retry',
    passport.authenticate('bearer'),
    access.authorize('READ_EXPORT'),
    loadExportMetadata,
    getEvent,
    validateEventAccess,
    mapUsers,
    mapDevices,
    function (req, res, next) {
      exportInBackground(req.parameters.exportId, req.event, req.users, req.devices).catch(err => {
        log.warn(err);
      });

      const exportResponse = {
        exportId: req.parameters.exportId
      };
      res.json(exportResponse);
      return next();
    });
};

function loadExportMetadata(req, res, next) {
  ExportMetadata.getExportMetadataById(req.param("exportId")).then(result => {
    const parameters = { filter: {} };

    parameters.filter.eventId = result.options.eventId;
    parameters.exportId = result._id;

    req.parameters = parameters;

    next();
  }).catch(err => { next(err) });
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

  const observations = req.param('observations');
  if (observations) {
    parameters.filter.exportObservations = observations === true;

    if (parameters.filter.exportObservations) {
      parameters.filter.favorites = req.param('favorites') === true;
      if (parameters.filter.favorites) {
        parameters.filter.favorites = {
          userId: req.user._id
        };
      }

      parameters.filter.important = req.param('important') === true;
      parameters.filter.attachments = req.param('attachments') === true;
    }
  }

  const locations = req.param('locations');
  if (locations) {
    parameters.filter.exportLocations = locations === true;
  }

  req.parameters = parameters;

  next();
}

function validateEventAccess(req, res, next) {
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

function getEvent(req, res, next) {
  Event.getById(req.parameters.filter.eventId, {}, function (err, event) {
    req.event = event;

    // form map
    event.formMap = {};

    // create a field by name map, I will need this later
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

function exportInBackground(exportId, event, users, devices) {
  log.info('Setting up export of ' + exportId);

  return ExportMetadata.updateExportMetadataStatus(exportId, ExportMetadata.ExportStatus.Running).then(meta => {

    //TODO possibly move this to some init script?
    log.debug('Checking to see if we need to create ' + exportDirectory);
    if (!fs.existsSync(exportDirectory)) {
      log.info('Creating directory ' + exportDirectory);
      fs.mkdirSync(exportDirectory);
    }

    const filename = exportId + '-' + meta.exportType + '.zip';
    meta.physicalPath = exportDirectory + '/' + filename;
    meta.filename = filename;
    return ExportMetadata.updateExportMetadata(meta);
  }).then(meta => {
    //TODO adding type and attachment functions to support current (version 5.4.2) export implementations.
    //can probably move this to the top of this class
    Writable.prototype.type = function () { };
    Writable.prototype.attachment = function () { };

    log.debug('Constructing file ' + meta.physicalPath);
    const writableStream = fs.createWriteStream(meta.physicalPath);
    writableStream.on('finish', () => {
      log.info('Successfully completed export of ' + exportId);
      ExportMetadata.updateExportMetadataStatus(exportId, ExportMetadata.ExportStatus.Completed);
    });

    return Promise.resolve({
      meta: meta,
      stream: writableStream
    });
  }).then(data => {
    const options = {
      event: event,
      users: users,
      devices: devices,
      filter: data.meta.options.filter
    };
    log.info('Begining actual export of ' + exportId + ' (' + data.meta.exportType + ')');
    const exporter = exporterFactory.createExporter(data.meta.exportType.toLowerCase(), options);
    return exporter.export(data.stream);
  }).catch(err => {
    log.warn('Failed export of ' + exportId, err);

    ExportMetadata.updateExportMetadataStatus(exportId, ExportMetadata.ExportStatus.Failed);
  });
}
