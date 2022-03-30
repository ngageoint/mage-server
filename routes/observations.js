module.exports = function(app, security) {

  const async = require('async')
    , api = require('../api')
    , log = require('winston')
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
    , {default: upload} = require('../upload')
    , Media = require('../validation/media')
    , FileType = require('file-type')
    , passport = security.authentication.passport;

  const sortColumnWhitelist = ["lastModified"];

  function transformOptions(req) {
    return {
      event: req.event,
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

  function validateAttachmentFile(req, res, next) {
    FileType.fromFile(req.file.path).then(fileType => {
      const media = new Media(fileType.mime);
      const attachment = req.observation.attachments.find(attachment => attachment._id.toString() === req.params.attachmentId);
      const observationForm = req.observation.properties.forms.find(observationForm => {
        return observationForm._id.toString() === attachment.observationFormId.toString()
      });

      if (!observationForm) return res.status(400).send('Attachment form not found');
      const formDefinition = req.event.forms.find(form => form._id === observationForm.formId);

      const fieldDefinition = formDefinition.fields.find(field => field.name === attachment.fieldName);
      if (!fieldDefinition) return res.status(400).send('Attachment field not found');

      if (!media.validate(fieldDefinition.allowedAttachmentTypes)) {
        return res.status(400).send(`Invalid attachment '${attachment.name}', type must be one of ${fieldDefinition.allowedAttachmentTypes.join(' or ')}`);
      }

      next();
    });
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
      if (err) {
        return next(err);
      }
      next();
    });
  }

  function fetchExistingObservation(req, res, next) {
    new api.Observation(req.event).getById(req.params.existingObservationId, function (err, observation) {
      req.existingObservation = observation;
      next(err);
    });
  }

  function populateObservation(req, res, next) {
    req.observation = {};

    if (!req.existingObservation) {
      const userId = req.user ? req.user._id : null;
      if (userId) {
        req.observation.userId = userId;
      }
      const deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      if (deviceId) {
        req.observation.deviceId = deviceId;
      }
    }

    req.observation.type = req.body.type;

    if (req.body.geometry) {
      req.observation.geometry = req.body.geometry;
    }

    if (req.body.properties) {
      req.observation.properties = req.body.properties;
    }

    req.observation.attachments = req.existingObservation ? req.existingObservation.attachments : [];

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
    var form = {};
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
    const parameters = {
      filter: {
      }
    };

    const fields = req.query.fields;
    if (fields) {
      parameters.fields = JSON.parse(fields);
    }

    const startDate = req.query.startDate;
    if (startDate) {
      parameters.filter.startDate = moment(startDate).utc().toDate();
    }

    const endDate = req.query.endDate;
    if (endDate) {
      parameters.filter.endDate = moment(endDate).utc().toDate();
    }

    const observationStartDate = req.query.observationStartDate;
    if (observationStartDate) {
      parameters.filter.observationStartDate = moment(observationStartDate).utc().toDate();
    }

    const observationEndDate = req.query.observationEndDate;
    if (observationEndDate) {
      parameters.filter.observationEndDate = moment(observationEndDate).utc().toDate();
    }

    const bbox = req.query.bbox;
    if (bbox) {
      parameters.filter.geometries = geometryFormat.parse('bbox', bbox);
    }

    const geometry = req.query.geometry;
    if (geometry) {
      parameters.filter.geometries = geometryFormat.parse('geometry', geometry);
    }

    const states = req.query.states;
    if (states) {
      parameters.filter.states = states.split(',');
    }

    const sort = req.query.sort;
    if (sort) {
      const columns = {};
      let err = null;
      sort.split(',').every(function(column) {
        const sortParams = column.split('+');
        // Check sort column is in whitelist
        if (sortColumnWhitelist.indexOf(sortParams[0]) === -1) {
          err = `Cannot sort on column '${sortParams[0]}'`;
          return false; // break
        }
        // Order can be nothing (ASC by default) or ASC, DESC
        let direction = 1; // ASC
        if (sortParams.length > 1 && sortParams[1] === 'DESC') {
          direction = -1; // DESC
        }
        columns[sortParams[0]] = direction;
      });
      if (err) {
        return res.status(400).send(err);
      }
      parameters.sort = columns;
    }

    parameters.populate = req.query.populate === 'true';

    req.parameters = parameters;

    next();
  }

  // TODO: set a location header for the created observation
  app.post(
    '/api/events/:eventId/observations/id',
    passport.authenticate('bearer'),
    validateObservationCreateAccess(false),
    function (req, res, next) {
      new api.Observation().createObservationId(function(err, doc) {
        if (err) return next(err);

        const response = observationXform.transform(doc, transformOptions(req));
        res.status(201).json(response);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:existingObservationId',
    passport.authenticate('bearer'),
    fetchExistingObservation,
    validateCreateOrUpdateAccess,
    populateObservation,
    populateUserFields,
    function (req, res, next) {
      const existingObservation = req.existingObservation;
      const {forms = []} = req.observation.properties || {}
      forms.map(observationForm => {
        if (existingObservation) {
          const { forms: exisitingForms = [] } = existingObservation.properties || {}
          const exisitingForm = exisitingForms.find(exisitingForm => exisitingForm._id.toString() === observationForm.id);
          if (exisitingForm) {
            observationForm._id = exisitingForm._id;
            delete observationForm.id;
          }
        }

        return observationForm;
      });

      new api.Observation(req.event).update(req.params.existingObservationId, req.observation, function(err, updatedObservation) {
        if (err) return next(err);

        if (!updatedObservation) {
          return res.status(404).send(`Observation with ID ${req.params.existingObservationId} does not exist`);
        }

        const response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
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
      const formMap = {};
      req.event.forms.forEach(function (form) {
        const fieldsByName = {};
        form.fields.forEach(function (field) {
          fieldsByName[field.name] = field;
        });
        form.fieldsByName = fieldsByName;

        formMap[form.id] = form;
      });

      const archive = archiver('zip');
      archive.pipe(res);

      app.render('observation', {
        event: req.event,
        formMap: formMap,
        observation: req.observation,
        center: turfCentroid(req.observation).geometry,
        user: req.observationUser
      }, function (err, html) {
        archive.append(html, { name: req.observation._id + '/index.html' });

        if (req.observationIcon) {
          const iconPath = path.join(environment.iconBaseDirectory, req.observationIcon.relativePath);
          archive.file(iconPath, { name: req.observation._id + '/media/icon.png' });
        }

        req.observation.attachments.forEach(function (attachment) {
          archive.file(path.join(environment.attachmentBaseDirectory, attachment.relativePath), { name: req.observation._id + '/media/' + attachment.name });
        });

        archive.finalize();
      });
    }
  );

  app.get(
    '/api/events/:eventId/observations/:observationIdInPath',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    parseQueryParams,
    function (req, res, next) {
      const options = { fields: req.parameters.fields };
      new api.Observation(req.event).getById(req.params.observationIdInPath, options, function(err, observation) {
        if (err) {
          return next(err);
        }
        if (!observation) {
          return res.sendStatus(404);
        }
        const response = observationXform.transform(observation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.get(
    '/api/events/:eventId/observations',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    parseQueryParams,
    function (req, res, next) {
      const options = {
        filter: req.parameters.filter,
        fields: req.parameters.fields,
        sort: req.parameters.sort,
        populate: req.parameters.populate
      };

      new api.Observation(req.event).getAll(options, function(err, observations) {
        if (err) return next(err);
        res.json(observationXform.transform(observations, transformOptions(req)));
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:observationIdInPath/favorite',
    passport.authenticate('bearer'),
    validateObservationCreateAccess(false),
    function (req, res, next) {
      new api.Observation(req.event).addFavorite(req.params.observationIdInPath, req.user, function(err, updatedObservation) {
        if (err) {
          return next(err);
        }
        if (!updatedObservation) {
          return res.status(404).send(`Observation with ID ${req.params.observationIdInPath} does not exist`);
        }
        const response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/observations/:observationIdInPath/favorite',
    passport.authenticate('bearer'),
    validateObservationCreateAccess(false),
    function (req, res, next) {

      new api.Observation(req.event).removeFavorite(req.params.observationIdInPath, req.user, function(err, updatedObservation) {
        if (err) return next(err);
        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.observationIdInPath + " does not exist");

        const response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:observationId/important',
    passport.authenticate('bearer'),
    authorizeEventAccess('UPDATE_EVENT', 'update'),
    function (req, res, next) {
      const important = {
        userId: req.user._id,
        timestamp: new Date(),
        description: req.body.description
      };

      new api.Observation(req.event).addImportant(req.observation._id, important, function(err, updatedObservation) {
        if (err) return next(err);
        if (!updatedObservation) return res.status(404).send('Observation with id ' + req.params.id + " does not exist");

        const response = observationXform.transform(updatedObservation, transformOptions(req));
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

        const response = observationXform.transform(updatedObservation, transformOptions(req));
        res.json(response);
      });
    }
  );

  app.post(
    '/api/events/:eventId/observations/:observationId/states',
    passport.authenticate('bearer'),
    authorizeDeleteAccess,
    function(req, res) {
      let state = req.body;
      if (!state) {
        return res.send(400);
      }
      if (!state.name) {
        return res.status(400).send('name required');
      }
      if (state.name !== 'active' && state.name !== 'archive') {
        return res.status(400).send("state name must be one of 'active', 'complete', 'archive'");
      }
      state = { name: state.name };
      if (req.user) {
        state.userId = req.user._id;
      }
      new api.Observation(req.event).addState(req.observation._id, state, function(err, state) {
        if (err) {
          return res.status(400).send('state is already ' + "'" + state.name + "'");
        }
        res.status(201).json(state);
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:observationId/attachments/:attachmentId',
    passport.authenticate('bearer'),
    validateObservationCreateAccess(false),
    upload.single('attachment'),
    validateAttachmentFile,
    function (req, res, next) {
      if (!req.file) {
        return res.status(400).send('no attachment');
      }

      new api.Attachment(req.event, req.observation).update(req.params.attachmentId, req.file, function (err, attachment) {
        if (err) return next(err);

        if (!attachment) return res.sendStatus(404);

        req.observation.attachments = [attachment];
        const response = observationXform.transform(req.observation, transformOptions(req)).attachments[0]
        return res.json(response);
      });
    }
  );

  app.get(
    '/api/events/:eventId/observations/:observationId/attachments/:attachmentId',
    passport.authenticate('bearer'),
    validateObservationReadAccess,
    function(req, res, next) {
      new api.Attachment(req.event, req.observation).getById(req.params.attachmentId, {size: req.query.size}, function(err, attachment) {
        if (err) return next(err);

        if (!attachment || !attachment.path) return res.sendStatus(404);

        let stream;
        if (req.headers.range) {
          const attachmentRangeEnd = attachment.size > 0 ? attachment.size - 1 : 0;
          const range = req.headers.range;
          const rangeParts = range.replace(/bytes=/, "").split("-");
          const rangeStart = parseInt(rangeParts[0], 10);
          const rangeEnd = rangeParts[1] ? parseInt(rangeParts[1], 10) : attachmentRangeEnd;
          const contentLength = (rangeEnd - rangeStart) + 1;

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

  app.delete(
    '/api/events/:eventId/observations/:observationId/attachments/:attachmentId',
    passport.authenticate('bearer'),
    authorizeDeleteAccess,
    function(req, res, next) {
      new api.Attachment(req.event, req.observation).delete(req.params.attachmentId, err => {
        if (err) return next(err);

        res.sendStatus(204);
      });
    }
  );
};
