module.exports = function(app, security) {

  var async = require('async')
    , api = require('../api')
    , log = require('winston')
    , pug = require('pug')
    , archiver = require('archiver')
    , path = require('path')
    , environment = require('../environment/env')
    , fs = require('fs-extra')
    , moment = require('moment')
    , Event = require('../models/event')
    , Team = require('../models/team')
    , access = require('../access')
    , turfCentroid = require('@turf/centroid')
    , geometryFormat = require('../format/geoJsonFormat')
    , observationXform = require('../transformers/observation')
    , passport = security.authentication.passport;

  var sortColumnWhitelist = ["lastModified"];

  function transformOptions(req) {
    return {
      eventId: req.event._id,
      path: req.getPath().match(/(.*observations)/)[0]
    };
  }

  function validateObservationReadAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_OBSERVATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_OBSERVATION_EVENT')) {
      // Make sure I am part of this event
      Event.userHasEventPermission(req.event, req.user._id, 'read', function(err, hasPermission) {
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

  function validateObservationCreateAccess(validateObservationId) {
    return function(req, res, next) {

      if (!access.userHasPermission(req.user, 'CREATE_OBSERVATION')) {
        return res.sendStatus(403);
      }

      var tasks = [];
      if (validateObservationId) {
        tasks.push(function(done) {
          new api.Observation().validateObservationId(req.param('id'), done);
        });
      }

      tasks.push(function(done) {
        Team.teamsForUserInEvent(req.user, req.event, function(err, teams) {
          if (err) return next(err);

          if (teams.length === 0) {
            return res.status(403).send('Cannot submit an observation for an event that you are not part of.');
          }

          done();
        });
      });

      async.series(tasks, next);
    };
  }

  function validateObservationUpdateAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'UPDATE_OBSERVATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'UPDATE_OBSERVATION_EVENT')) {
      // Make sure I am part of this event
      Event.userHasEventPermission(req.event, req.user._id, 'read', function(err, hasPermission) {
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

  function validateCreateOrUpdateAccess(req, res, next) {
    req.existingObservation ?
      validateObservationUpdateAccess(req, res, next) :
      validateObservationCreateAccess(true)(req, res, next);
  }

  function authorizeEventAccess(collectionPermission, aclPermission) {
    return function(req, res, next) {
      if (access.userHasPermission(req.user, collectionPermission)) {
        next();
      } else {
        Event.userHasEventPermission(req.event, req.user._id, aclPermission, function(err, hasPermission) {
          hasPermission ? next() : res.sendStatus(403);
        });
      }
    };
  }

  function authorizeDeleteAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'UPDATE_EVENT')) {
      next();
    } else if (req.user._id.toString() === req.observation.userId.toString()) {
      next();
    } else {
      Event.userHasEventPermission(req.event, req.user._id, 'update', function(err, hasPermission) {
        hasPermission ? next() : res.sendStatus(403);
      });
    }
  }

  function populateUserFields(req, res, next) {
    new api.Form(req.event).populateUserFields(function(err) {
      if (err) return next(err);

      next();
    });
  }

  function getObservation(req, res, next) {
    new api.Observation(req.event).getById(req.param('id'), function(err, observation) {
      req.existingObservation = observation;
      next(err);
    });
  }

  function populateObservation(req, res, next) {
    req.observation = {};

    if (!req.existingObservation) {
      var userId = req.user ? req.user._id : null;
      if (userId) req.observation.userId = userId;

      var deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      if (deviceId) req.observation.deviceId = deviceId;

      var state = { name: 'active' };
      if (userId) state.userId = userId;
      req.observation.states = [state];
    }

    req.observation.type = req.body.type;

    if (req.body.geometry) {
      req.observation.geometry = req.body.geometry;
    }

    if (req.body.properties) {
      req.observation.properties = req.body.properties;
    }

    next();
  }

  function getUserForObservation(req, res, next) {
    var userId = req.observation.userId;
    if (!userId) return next();

    new api.User().getById(userId, function(err, user) {
      if (err) return next(err);

      req.observationUser = user;
      next();
    });
  }

  function getIconForObservation(req, res, next) {
    var form;
    var primary;
    var secondary;
    if (req.observation.properties.forms.length) {
      var formId = req.observation.properties.forms[0].formId;
      var formDefinitions = req.event.forms.filter(function(form) {
        return form._id === formId;
      });

      if (formDefinitions.length) {
        form = formDefinitions[0];
        primary = req.observation.properties.forms[0][form.primaryField];
        secondary = req.observation.properties.forms[0][form.variantField];
      }
    }

    new api.Icon(req.event._id, form._id, primary, secondary).getIcon(function(err, icon) {
      if (err) return next(err);

      req.observationIcon = icon;
      next();
    });
  }

  function parseQueryParams(req, res, next) {
    // setup defaults
    var parameters = {
      filter: {
      }
    };

    var fields = req.param('fields');
    if (fields) {
      parameters.fields = JSON.parse(fields);
    }

    var startDate = req.param('startDate');
    if (startDate) {
      parameters.filter.startDate = moment(startDate).utc().toDate();
    }

    var endDate = req.param('endDate');
    if (endDate) {
      parameters.filter.endDate = moment(endDate).utc().toDate();
    }

    var observationStartDate = req.param('observationStartDate');
    if (observationStartDate) {
      parameters.filter.observationStartDate = moment(observationStartDate).utc().toDate();
    }

    var observationEndDate = req.param('observationEndDate');
    if (observationEndDate) {
      parameters.filter.observationEndDate = moment(observationEndDate).utc().toDate();
    }

    var bbox = req.param('bbox');
    if (bbox) {
      parameters.filter.geometries = geometryFormat.parse('bbox', bbox);
    }

    var geometry = req.param('geometry');
    if (geometry) {
      parameters.filter.geometries = geometryFormat.parse('geometry', geometry);
    }

    var states = req.param('states');
    if (states) {
      parameters.filter.states = states.split(',');
    }

    var sort = req.param('sort');

    if (sort) {
      var columns = {};
      var err = null;
      sort.split(',').every(function(column) {
        var sortParams = column.split('+');
        // Check sort column is in whitelist
        if (sortColumnWhitelist.indexOf(sortParams[0]) === -1) {
          err = "Cannot sort on column '" + sortParams[0] + "'";
          return false; // break
        }

        // Order can be nothing (ASC by default) or ASC, DESC
        var direction = 1; //ASC
        if (sortParams.length > 1 && sortParams[1] === 'DESC') {
          direction = -1; // DESC
        }

        columns[sortParams[0]] = direction;
      });

      if (err) return res.status(400).send(err);

      parameters.sort = columns;
    }

    req.parameters = parameters;

    next();
  }

  app.get(
    '/api/events/:eventId/observations',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    parseQueryParams,
    function (req, res, next) {
      var options = {
        filter: req.parameters.filter,
        fields: req.parameters.fields,
        sort: req.parameters.sort
      };

      new api.Observation(req.event).getAll(options, function(err, observations) {
        if (err) return next(err);
        res.json(observationXform.transform(observations, transformOptions(req)));
      });
    }
  );

  app.get(
    '/api/events/:eventId/observations/(:observationId).zip',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    getUserForObservation,
    getIconForObservation,
    function (req, res) {
      var formMap = {};
      req.event.forms.forEach(function(form) {
        var fieldsByName = {};
        form.fields.forEach(function(field) {
          fieldsByName[field.name] = field;
        });
        form.fieldsByName = fieldsByName;

        formMap[form.id] = form;
      });

      var archive = archiver('zip');
      archive.pipe(res);
      var html = pug.renderFile('views/observation.pug', {
        event: req.event,
        formMap: formMap,
        observation: req.observation,
        center: turfCentroid(req.observation).geometry,
        user: req.observationUser
      });
      archive.append(html, { name: req.observation._id + '/index.html' });

      if (req.observationIcon) {
        archive.file(req.observationIcon, {name: req.observation._id + '/media/icon.png'});
      }

      req.observation.attachments.forEach(function(attachment) {
        archive.file(path.join(environment.attachmentBaseDirectory, attachment.relativePath), {name: req.observation._id + '/media/' + attachment.name});
      });

      archive.finalize();
    }
  );

  app.get(
    '/api/events/:eventId/observations/:id',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    parseQueryParams,
    function (req, res, next) {
      var options = {fields: req.parameters.fields};
      new api.Observation(req.event).getById(req.param('id'), options, function(err, observation) {
        if (err) return next(err);

        if (!observation) return res.sendStatus(404);

        var response = observationXform.transform(observation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.post(
    '/api/events/:eventId/observations/id',
    passport.authenticate('bearer'),
    validateObservationCreateAccess(false),
    function (req, res, next) {
      new api.Observation().createObservationId(function(err, doc) {
        if (err) return next(err);

        var response = observationXform.transform(doc, transformOptions(req));
        res.status(201).json(response);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:id',
    passport.authenticate('bearer'),
    getObservation,
    validateCreateOrUpdateAccess,
    populateObservation,
    populateUserFields,
    function (req, res, next) {
      new api.Observation(req.event).update(req.param('id'), req.observation, function(err, updatedObservation) {
        if (err) return next(err);

        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.id + " does not exist");

        var response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:id/favorite',
    passport.authenticate('bearer'),
    function (req, res, next) {
      new api.Observation(req.event).addFavorite(req.params.id, req.user, function(err, updatedObservation) {
        if (err) return next(err);
        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.id + " does not exist");

        var response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/observations/:id/favorite',
    passport.authenticate('bearer'),
    function (req, res, next) {

      new api.Observation(req.event).removeFavorite(req.params.id, req.user, function(err, updatedObservation) {
        if (err) return next(err);
        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.id + " does not exist");

        var response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:observationId/important',
    passport.authenticate('bearer'),
    authorizeEventAccess('UPDATE_EVENT', 'update'),
    function (req, res, next) {
      var important = {
        userId: req.user._id,
        timestamp: new Date(),
        description: req.body.description
      };

      new api.Observation(req.event).addImportant(req.observation._id, important, function(err, updatedObservation) {
        if (err) return next(err);
        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.id + " does not exist");

        var response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/observations/:observationId/important',
    passport.authenticate('bearer'),
    authorizeEventAccess('UPDATE_EVENT', 'update'),
    function (req, res, next) {

      new api.Observation(req.event).removeImportant(req.observation._id, function(err, updatedObservation) {
        if (err) return next(err);
        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.id + " does not exist");

        var response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.post(
    '/api/events/:eventId/observations/:observationId/states',
    passport.authenticate('bearer'),
    authorizeDeleteAccess,
    function(req, res) {
      var state = req.body;
      if (!state) return res.send(400);
      if (!state.name) return res.status(400).send('name required');
      if (state.name !== 'active' && state.name !== 'complete' && state.name !== 'archive') {
        return res.status(400).send("state name must be one of 'active', 'complete', 'archive'");
      }

      state = { name: state.name };
      if (req.user) state.userId = req.user._id;

      new api.Observation(req.event).addState(req.observation._id, state, function(err, state) {
        if (err) {
          return res.status(400).send('state is already ' + "'" + state.name + "'");
        }

        res.status(201).json(state);
      });
    }
  );

  app.get(
    '/api/events/:eventId/observations/:id/attachments',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    function(req, res, next) {
      var fields = {attachments: true};
      var options = {fields: fields};
      new api.Observation(req.event).getById(req.param('id'), options, function(err, observation) {
        if (err) return next(err);

        var response = observationXform.transform(observation, transformOptions(req));
        res.json(response.attachments);
      });
    }
  );

  app.get(
    '/api/events/:eventId/observations/:observationId/attachments/:attachmentId',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    function(req, res, next) {
      new api.Attachment(req.event, req.observation).getById(req.param('attachmentId'), {size: req.param('size')}, function(err, attachment) {
        if (err) return next(err);

        if (!attachment) return res.sendStatus(404);

        var stream;
        if (req.headers.range) {
          var attachmentRangeEnd = attachment.size > 0 ? attachment.size - 1 : 0;
          var range = req.headers.range;
          var rangeParts = range.replace(/bytes=/, "").split("-");
          var rangeStart = parseInt(rangeParts[0], 10);
          var rangeEnd = rangeParts[1] ? parseInt(rangeParts[1], 10) : attachmentRangeEnd;
          var contentLength = (rangeEnd - rangeStart) + 1;


          stream = fs.createReadStream(attachment.path, {start: rangeStart, end: rangeEnd});
          stream.on('open', function() {
            res.writeHead(206, {
              'Content-Range': 'bytes ' + rangeStart + '-' + rangeEnd + '/' + attachment.size,
              'Accept-Ranges': 'bytes',
              'Content-Length': contentLength,
              'Content-Type': attachment.contentType
            });

            stream.pipe(res);
          });

          stream.on('error', function(err) {
            log.error('error streaming attachment', err);
            return res.sendStatus(404);
          });
        } else {
          stream = fs.createReadStream(attachment.path);

          stream.on('open', function() {
            res.writeHead(200, {
              'Content-Length': attachment.size,
              'Content-Type': attachment.contentType
            });

            stream.pipe(res);
          });

          stream.on('error', function(err) {
            log.error('error streaming attachment', err);
            return res.sendStatus(404);
          });
        }
      });
    }
  );

  app.post(
    '/api/events/:eventId/observations/:observationId/attachments',
    passport.authenticate('bearer'),
    access.authorize('CREATE_OBSERVATION'),
    function(req, res, next) {
      var attachment = req.files.attachment;
      if (!attachment) return res.status(400).send("no attachment");

      new api.Attachment(req.event, req.observation).create(req.observationId, req.files.attachment, function(err, attachment) {
        if (err) return next(err);

        var observation = req.observation;
        observation.attachments = [attachment.toObject()];
        return res.json(observationXform.transform(observation, transformOptions(req)).attachments[0]);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:observationId/attachments/:attachmentId',
    passport.authenticate('bearer'),
    validateObservationUpdateAccess,
    function(req, res, next) {
      new api.Attachment(req.event, req.observation).update(req.params.attachmentId, req.files.attachment, function(err, attachment) {
        if (err) return next(err);

        var observation = req.observation;
        observation.attachments = [attachment.toObject()];
        return res.json(observationXform.transform(observation, transformOptions(req)).attachments[0]);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/observations/:observationId/attachments/:attachmentId',
    passport.authenticate('bearer'),
    access.authorize('DELETE_OBSERVATION'),
    function(req, res, next) {
      new api.Attachment(req.event, req.observation).delete(req.param('attachmentId'), function(err) {
        if (err) return next(err);

        res.sendStatus(200);
      });
    }
  );
};
