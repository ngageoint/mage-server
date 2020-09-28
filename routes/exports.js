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

  /**
   * @deprecated Use {@code /api/export/} instead
   */
  app.get(
    '/api/:exportType(geojson|kml|shapefile|csv)',
    security.authentication.passport.authenticate('bearer'),
    parseQueryParams,
    getEvent,
    validateEventAccess,
    mapUsers,
    mapDevices,
    function (req, res) {
      log.warn('Deprecated export method called');

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

  app.get(
    '/api/export/:exportType(geojson|kml|shapefile|csv)',
    security.authentication.passport.authenticate('bearer'),
    parseQueryParams,
    getEvent,
    validateEventAccess,
    mapUsers,
    mapDevices,
    function (req, res, next) {

      const meta = {
        userId: req.user._id,
        exportType: req.params.exportType,
        options: {
          eventId: req.event._id,
          filter: req.parameters.filter
        }
      };

      ExportMetadata.createMetadata(meta).then(result => {
        //TODO figure out event, users and devices
        exportInBackground(result._id, req.event, req.users, req.devices).catch(err => {
          log.warn(err);
        });
        res.location('/api/export/' + result._id.toString());
        res.status(201);
        res.end(result._id.toString());
        return next();
      }).catch(err => {
        log.warn(err);
        return next(err);
      });
    }
  );

  app.get(
    '/api/export/:exportId',
    security.authentication.passport.authenticate('bearer'),
    parseQueryParams,
    function (req, res, next) {
      //TODO implement
    }
  );

  app.get(
    '/api/export/:exportId/status',
    security.authentication.passport.authenticate('bearer'),
    parseQueryParams,
    function (req, res, next) {
      return ExportMetadata.getExportMetadataById(req.params.exportId).then(meta => {
        res.end(meta.status);
        return next();
      }).catch(err => {
        return next(err);
      });
    }
  );

};

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
    parameters.filter.exportObservations = observations === 'true';

    if (parameters.filter.exportObservations) {
      parameters.filter.favorites = req.param('favorites') === 'true';
      if (parameters.filter.favorites) {
        parameters.filter.favorites = {
          userId: req.user._id
        };
      }

      parameters.filter.important = req.param('important') === 'true';
      parameters.filter.attachments = req.param('attachments') === 'true';
    }
  }

  const locations = req.param('locations');
  if (locations) {
    parameters.filter.exportLocations = locations === 'true';
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
  return ExportMetadata.updateExportMetadataStatus(exportId, ExportMetadata.ExportStatus.Running).then(meta => {
    log.debug('Begining export of ' + exportId);
    const options = {
      event: event,
      users: users,
      devices: devices,
      filter: meta.options.filter
    };

    const exporter = exporterFactory.createExporter(meta.exportType, options);

    if (!fs.existsSync(exportDirectory)) {
      fs.mkdirSync(exportDirectory);
    }

    const filename = exportDirectory + '/' + exportId + '-' + meta.exportType + '.zip';
    const writableStream = fs.createWriteStream(filename);
    Writable.prototype.type = function () { };
    Writable.prototype.attachment = function () { };

    exporter.export(writableStream);

    //event that gets called when the writing is complete
    return writableStream.on('finish', () => {
      log.debug('Successfully completed export of ' + exportId);
      return ExportMetadata.updateExportMetadataStatus(exportId, ExportMetadata.ExportStatus.Completed);
    });
  }).catch(err => {
    log.warn('Failed export of ' + exportId, err);
    return ExportMetadata.updateExportMetadataStatus(exportId, ExportMetadata.ExportStatus.Failed).then(() => {
      return Promise.reject(err);
    });
  });
}
