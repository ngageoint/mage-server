module.exports = function (app, security) {

  const api = require('../api')
    , log = require('winston')
    , archiver = require('archiver')
    , path = require('path')
    , environment = require('../environment/env')
    , access = require('../access')
    , { default: turfCentroid } = require('@turf/centroid')
    , observationXform = require('../transformers/observation')
    , passport = security.authentication.passport
    , { defaultEventPermissionsService: eventPermissions } = require('../permissions/permissions.events');

  function transformOptions(req) {
    return {
      event: req.event,
      path: req.getPath().match(/(.*observations)/)[0]
    };
  }

  async function validateObservationReadAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_OBSERVATION_ALL')) {
      return next();
    }
    if (access.userHasPermission(req.user, 'READ_OBSERVATION_EVENT')) {
      // Make sure I am part of this event
      const hasPermission = await eventPermissions.userHasEventPermission(req.event, req.user.id, 'read')
      if (hasPermission) {
        return next();
      }
    }
    res.sendStatus(403);
  }

  function validateObservationCreateAccess() {
    return async (req, res, next) => {
      if (!access.userHasPermission(req.user, 'CREATE_OBSERVATION')) {
        return res.sendStatus(403);
      }
      const isParticipant = await eventPermissions.userIsParticipantInEvent(req.event, req.user.id)
      if (isParticipant) {
        return next()
      }
      res.status(403).send('You must be an event participant to perform this operation.')
    }
  }

  function authorizeEventAccess(collectionPermission, aclPermission) {
    return async function (req, res, next) {
      if (access.userHasPermission(req.user, collectionPermission)) {
        return next();
      }
      const hasPermission = await eventPermissions.userHasEventPermission(req.event, req.user.id, aclPermission)
      if (hasPermission) {
        return next();
      }
      res.sendStatus(403);
    };
  }

  async function authorizeDeleteAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'UPDATE_EVENT')) {
      return next();
    }
    if (req.user._id.toString() === req.observation.userId.toString()) {
      return next();
    }
    const hasPermission = await eventPermissions.userHasEventPermission(req.event, req.user.id, 'update')
    if (hasPermission) {
      return next();
    }
    res.sendStatus(403);
  }

  function getUserForObservation(req, res, next) {
    var userId = req.observation.userId;
    if (!userId) return next();
    // TODO: users-next
    new api.User().getById(userId, function (err, user) {
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
      var formDefinitions = req.event.forms.filter(function (form) {
        return form._id === formId;
      });

      if (formDefinitions.length) {
        form = formDefinitions[0];
        primary = req.observation.properties.forms[0][form.primaryField];
        secondary = req.observation.properties.forms[0][form.variantField];
      }
    }

    new api.Icon(req.event._id, form._id, primary, secondary).getIcon(function (err, icon) {
      if (err) return next(err);

      req.observationIcon = icon;
      next();
    });
  }

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

      res.render('observation', {
        event: req.event,
        formMap: formMap,
        observation: req.observation,
        center: turfCentroid(req.observation).geometry,
        user: req.observationUser
      }, function (err, html) {
        if (!err) {
          archive.append(html, { name: req.observation._id + '/index.html' });

          if (req.observationIcon) {
            const iconPath = path.join(environment.iconBaseDirectory, req.observationIcon.relativePath);
            archive.file(iconPath, { name: req.observation._id + '/media/icon.png' });
          }

          req.observation.attachments.forEach(function (attachment) {
            archive.file(path.join(environment.attachmentBaseDirectory, attachment.relativePath), { name: req.observation._id + '/media/' + attachment.name });
          });
        } else {
          log.warn(err);
        }

        archive.finalize();
      });
    }
  );

  app.put(
    '/api/events/:eventId/observations/:observationIdInPath/favorite',
    passport.authenticate('bearer'),
    /*
    TODO: this is a strange permission check.  this is because the request
    modifies data, but there is a USER_NO_EDIT_ROLE role that has permission to
    create observations, but not edit them.  however, simply being an event
    participant with read access would seem to be enough for permission to
    favorite an observation, because this does not mutate actual observation
    form data.
    */
    validateObservationCreateAccess(false),
    function (req, res, next) {
      new api.Observation(req.event).addFavorite(req.params.observationIdInPath, req.user, function (err, updatedObservation) {
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
    /* TODO: see above note on PUT favorite permission check */
    validateObservationCreateAccess(false),
    function (req, res, next) {

      new api.Observation(req.event).removeFavorite(req.params.observationIdInPath, req.user, function (err, updatedObservation) {
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

      new api.Observation(req.event).addImportant(req.observation._id, important, function (err, updatedObservation) {
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

      new api.Observation(req.event).removeImportant(req.observation._id, function (err, updatedObservation) {
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
    function (req, res) {
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
      new api.Observation(req.event).addState(req.observation._id, state, function (err, state) {
        if (err) {
          return res.status(400).send('state is already ' + "'" + state.name + "'");
        }
        res.status(201).json(state);
      });
    }
  );
};
