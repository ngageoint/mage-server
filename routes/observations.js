module.exports = function(app, security) {

  var api = require('../api')
    , log = require('winston')
    , fs = require('fs-extra')
    , moment = require('moment')
    , Event = require('../models/event')
    , Team = require('../models/team')
    , access = require('../access')
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
      Event.eventHasUser(req.event, req.user._id, function(err, eventHasUser) {
        if (eventHasUser) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function validateObservationUpdateAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'UPDATE_OBSERVATION_ALL')) {
      next();
    }else if (access.userHasPermission(req.user, 'UPDATE_OBSERVATION_EVENT')) {
      // Make sure I am part of this event
      Event.eventHasUser(req.event, req.user._id, function(err, eventHasUser) {
        if (eventHasUser) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function populateUserFields(req, res, next) {
    new api.Form(req.event).populateUserFields(function(err) {
      if (err) return next(err);

      next();
    });
  }

  function validateObservation(req, res, next) {
    var observation = req.body;
    observation.properties = observation.properties || {};

    Team.teamsForUserInEvent(req.user, req.event, function(err, teams) {
      if (err) return next(err);

      if (teams.length === 0) {
        return res.status(403).send('Cannot submit an observation for an event that you are not part of.');
      }

      var userId = req.user ? req.user._id : null;
      var state = {name: 'active'};
      if (userId) state.userId = userId;
      observation.states = [state];

      req.newObservation = {
        type: observation.type,
        geometry: observation.geometry,
        properties: observation.properties,
        states: [state],
        teamIds: teams.map(function(team) { return team._id; })
      };

      if (userId) req.newObservation.userId = userId;

      var deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      if (deviceId) req.newObservation.deviceId = deviceId;

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
    '/api/events/:eventId/observations',
    passport.authenticate('bearer'),
    access.authorize('CREATE_OBSERVATION'),
    populateUserFields,
    validateObservation,
    function (req, res, next) {
      new api.Observation(req.event).create(req.newObservation, function(err, newObservation) {
        if (err) return next(err);

        var response = observationXform.transform(newObservation, transformOptions(req));
        res.location(newObservation._id.toString()).json(response);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:id',
    passport.authenticate('bearer'),
    populateUserFields,
    validateObservationUpdateAccess,
    function (req, res, next) {

      var observation = {};
      if (req.body.geometry) observation.geometry = req.body.geometry;
      if (req.body.properties) {
        observation.properties = req.body.properties;
        if (!observation.properties.type) {
          return res.status(400).send("cannot update observation 'properties.type' param not specified");
        }

        if (!observation.properties.timestamp) {
          return res.status(400).send("cannot update observation 'properties.timestamp' param not specified");
        }

        observation.properties.timestamp = moment(observation.properties.timestamp).toDate();
      }

      var userId = req.user ? req.user._id : null;
      if (userId) observation.userId = userId;

      var deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      if (deviceId) observation.deviceId = deviceId;

      new api.Observation(req.event).update(req.param('id'), observation, function(err, updatedObservation) {
        if (err) return next(err);

        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.id + " does not exist");

        var response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.post(
    '/api/events/:eventId/observations/:id/states',
    passport.authenticate('bearer'),
    access.authorize('DELETE_OBSERVATION'),
    function(req, res) {
      var state = req.body;
      if (!state) return res.send(400);
      if (!state.name) return res.status(400).send('name required');
      if (state.name !== 'active' && state.name !== 'complete' && state.name !== 'archive') {
        return res.status(400).send("state name must be one of 'active', 'complete', 'archive'");
      }

      state = { name: state.name };
      if (req.user) state.userId = req.user._id;

      new api.Observation(req.event).addState(req.param('id'), state, function(err, state) {
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
          var range = req.headers.range;
          var rangeParts = range.replace(/bytes=/, "").split("-");
          var rangeStart = parseInt(rangeParts[0], 10);
          var rangeEnd = rangeParts[1] ? parseInt(rangeParts[1], 10) : attachment.size - 1;
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
