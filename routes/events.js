module.exports = function(app, security) {
  var Event = require('../models/event')
  , access = require('../access')
  , api = require('../api')
  , fs = require('fs-extra')
  , async = require('async');

  var passport = security.authentication.passport;

  function determineReadAccess(req, res, next) {
    if (!access.userHasPermission(req.user, 'READ_EVENT_ALL')) {
      req.access = { user: req.user, permission: 'read' };
    }

    next();
  }

  function authorizeAccess(collectionPermission, aclPermission) {
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

  function parseEventQueryParams(req, res, next) {
    var parameters = {};

    var state = req.param('state');
    if (!state || state === 'active') {
      parameters.complete = false;
    } else if (state === 'complete') {
      parameters.complete = true;
    }

    parameters.userId = req.param('userId');

    parameters.populate = true;
    if (req.query.populate === 'false') parameters.populate = false;

    var form = req.body.form || {};
    var fields = form.fields || [];
    var userFields = form.userFields || [];
    fields.forEach(function(field) {
      // remove userFields chocies, these are set dynamically
      if (userFields.indexOf(field.name) !== -1) {
        field.choices = [];
      }
    });

    req.parameters = parameters;

    next();
  }

  app.get(
    '/api/events/count',
    passport.authenticate('bearer'),
    determineReadAccess,
    function(req, res, next) {
      Event.count({access: req.access}, function(err, count) {
        if (err) return next(err);

        return res.json({count: count});
      });
    }
  );

  app.get(
    '/api/events',
    passport.authenticate('bearer'),
    determineReadAccess,
    parseEventQueryParams,
    function (req, res, next) {
      var filter = {
        complete: req.parameters.complete
      };
      if (req.parameters.userId) filter.userId = req.parameters.userId;

      Event.getEvents({access: req.access, filter: filter, populate: req.parameters.populate}, function(err, events) {
        if (err) return next(err);

        async.each(events, function(event, done) {
          new api.Form(event).populateUserFields(done);
        }, function(err) {
          if (err) return next(err);
          res.json(events.map(function(event) {
            return event.toObject({access: req.access});
          }));
        });
      });
    }
  );

  app.get(
    '/api/events/:eventId',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    determineReadAccess,
    parseEventQueryParams,
    function (req, res, next) {
      // TODO already queried event to check access, don't need to get it again.  Just need to populate the
      // correct fields based on query params
      Event.getById(req.event._id, {access: req.access, populate: req.parameters.populate}, function(err, event) {
        if (err) return next(err);
        if (!event) return res.sendStatus(404);

        new api.Form(event).populateUserFields(function(err) {
          if (err) return next(err);

          res.json(event.toObject({access: req.access}));
        });
      });
    }
  );

  app.post(
    '/api/events',
    passport.authenticate('bearer'),
    access.authorize('CREATE_EVENT'),
    parseEventQueryParams,
    function(req, res, next) {
      var event = req.body;

      if (!req.is('multipart/form-data')) return next();

      if (event.teamIds) {
        event.teamIds = event.teamIds.split(",");
      }

      if (event.layerIds) {
        event.layerIds = event.layerIds.split(",");
      }

      function validateForm(callback) {
        new api.Form().validate(req.files.form, function(err, form) {
          callback(err, form);
        });
      }

      function createEvent(form, callback) {
        event.form = form;
        Event.create(event, req.user, function(err, event) {
          callback(err, event, form);
        });
      }

      function importIcons(event, form, callback) {
        new api.Form(event).importIcons(req.files.form, form, function(err) {
          callback(err, event);
        });
      }

      function populateUserFields(event, callback) {
        new api.Form(event).populateUserFields(function(err) {
          callback(err, event);
        });
      }

      async.waterfall([
        validateForm,
        createEvent,
        importIcons,
        populateUserFields
      ], function (err, event) {
        if (err) {
          return next(err);
        }

        res.status(201).json(event);
      });
    }
  );

  app.post(
    '/api/events',
    passport.authenticate('bearer'),
    access.authorize('CREATE_EVENT'),
    parseEventQueryParams,
    function(req, res, next) {
      Event.create(req.body, req.user, function(err, event) {
        if (err) return next(err);

        //copy default icon into new event directory
        new api.Icon(event._id).setDefaultIcon(function(err) {
          if (err) {
            return next(err);
          }

          res.status(201).json(event);
        });
      });
    }
  );

  app.put(
    '/api/events/:eventId',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    parseEventQueryParams,
    function(req, res, next) {
      Event.update(req.event._id, req.body, {populate: req.parameters.populate}, function(err, event) {
        if (err) return next(err);

        new api.Form(event).populateUserFields(function(err) {
          if (err) return next(err);

          res.json(event);
        });
      });
    }
  );

  app.delete(
    '/api/events/:eventId',
    passport.authenticate('bearer'),
    authorizeAccess('DELETE_EVENT', 'delete'),
    function(req, res, next) {
      Event.remove(req.event, function(err) {
        if (err) return next(err);
        res.status(204).send();
      });
    }
  );

  app.put(
    '/api/events/:eventId/acl/:id',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.updateUserInAcl(req.event._id, req.params.id, req.body.role, function(err, event) {
        if (err) return next(err);
        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/acl/:id',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.removeUserFromAcl(req.event._id, req.params.id, function(err, event) {
        if (err) return next(err);
        res.json(event);
      });
    }
  );

  app.post(
    '/api/events/:eventId/forms',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_EVENT'),
    parseEventQueryParams,
    function(req, res, next) {
      var form = req.body || {};
      var fields = form.fields || [];
      var userFields = form.userFields || [];
      fields.forEach(function(field) {
        // remove userFields chocies, these are set dynamically
        if (userFields.indexOf(field.name) !== -1) {
          field.choices = [];
        }
      });

      Event.addForm(req.event._id, form, function(err, form) {
        console.log('ADDED FORM', err);
        if (err) return next(err);

        async.parallel([
          function(done) {
            //copy default icon into new event directory
            new api.Icon(req.event._id, form._id).setDefaultIcon(function(err) {
              done(err);
            });
          },
          function(done) {
            new api.Form(req.event, form).populateUserFields(function(err) {
              done(err);
            });
          }
        ], function(err) {
          if (err) return next(err);
          console.log('return new form', form.toJSON());
          res.status(201).json(form.toJSON());
        });
      });
    }
  );

  app.put(
    '/api/events/:eventId/forms/:formId',
    passport.authenticate('bearer'),
    access.authorize('UPDATE_EVENT'),
    parseEventQueryParams,
    function(req, res, next) {
      var form = req.body || {};
      var fields = form.fields || [];
      var userFields = form.userFields || [];
      fields.forEach(function(field) {
        // remove userFields chocies, these are set dynamically
        if (userFields.indexOf(field.name) !== -1) {
          field.choices = [];
        }
      });

      form._id = parseInt(req.params.formId);
      Event.updateForm(req.event._id, form, function(err, form) {
        if (err) return next(err);

        new api.Form(req.event, form).populateUserFields(function(err) {
          if (err) return next(err);

          res.json(form);
        });
      });
    }
  );

  app.post(
    '/api/events/:eventId/teams',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.addTeam(req.event, req.body, function(err, event) {
        if (err) return next(err);

        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/teams/:id',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.removeTeam(req.event, {id: req.params.id}, function(err, event) {
        if (err) return next(err);

        res.json(event);
      });
    }
  );

  app.post(
    '/api/events/:eventId/layers',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.addLayer(req.event, req.body, function(err, event) {
        if (err) return next(err);

        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/layers/:id',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.removeLayer(req.event, {id: req.params.id}, function(err, event) {
        if (err) return next(err);

        res.json(event);
      });
    }
  );

  // export a zip of the form json and icons
  app.get(
    '/api/events/:eventId/form.zip',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Form(req.event).export(function(err, file) {
        if (err) return next(err);

        res.attachment(req.event.name + "-form.zip");
        file.pipe(res);
      });
    }
  );

  app.get(
    '/api/events/:eventId/form/icons.zip',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res) {
      new api.Icon(req.event._id).getZipPath(function(err, zipPath) {
        res.on('finish', function() {
          fs.remove(zipPath, function() {
            console.log('Deleted the temp icon zip %s', zipPath);
          });
        });
        res.sendFile(zipPath);
      });
    }
  );

  // get icon
  app.get(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      console.log('get icon for formId: ', req.params.formId);
      new api.Icon(req.event._id, req.params.formId, req.params.primary, req.params.variant).getIcon(function(err, iconPath) {
        console.log('iconPath is: ', iconPath);
        if (err || !iconPath) return next();

        res.sendFile(iconPath);
      });
    }
  );

  app.get(
    '/api/events/:eventId/form/icons*',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Icon().getDefaultIcon(function(err, iconPath) {
        if (err) return next(err);

        if (!iconPath) return res.status(404).send();

        res.sendFile(iconPath);
      });
    }
  );

  // Create a new icon
  app.post(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      new api.Icon(req.event._id, req.params.formId, req.params.primary, req.params.variant).create(req.files.icon, function(err, icon) {
        if (err) return next(err);

        return res.json(icon);
      });
    }
  );

  // Delete an icon
  app.delete(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      new api.Icon(req.event._id, req.params.formId, req.params.primary, req.params.variant).delete(function(err) {
        if (err) return next(err);

        return res.status(204).send();
      });
    }
  );
};
