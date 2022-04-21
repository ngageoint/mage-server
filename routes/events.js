module.exports = function(app, security) {
  const Event = require('../models/event')
    , access = require('../access')
    , api = require('../api')
    , fs = require('fs-extra')
    , async = require('async')
    , util = require('util')
    , fileType = require('file-type')
    , {default: upload} = require('../upload')
    , userTransformer = require('../transformers/user');

  const passport = security.authentication.passport;

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
    const parameters = {};

    const projection = req.param('projection');
    if (projection) {
      parameters.projection = JSON.parse(projection);
    }

    const state = req.param('state');
    if (!state || state === 'active') {
      parameters.complete = false;
    } else if (state === 'complete') {
      parameters.complete = true;
    }

    parameters.userId = req.param('userId');
    parameters.populate = req.query.populate !== 'false';

    const form = req.body.form || {};
    const fields = form.fields || [];
    const userFields = form.userFields || [];
    fields.forEach(function(field) {
      // remove userFields chocies, these are set dynamically
      if (userFields.indexOf(field.name) !== -1) {
        field.choices = [];
      }
    });

    req.parameters = parameters;

    next();
  }

  function parseForm(req, res, next) {
    const form = req.body || {};
    const fields = form.fields || [];
    const userFields = form.userFields || [];
    fields.forEach(function(field) {
      // remove userFields chocies, these are set dynamically
      if (userFields.indexOf(field.name) !== -1) {
        field.choices = [];
      }
    });

    if (form.style) {
      const whitelistStyle = reduceStyle(form.style);
      const primaryField = form.fields.filter(function(field) {
        return field.name === form.primaryField;
      }).shift();
      const primaryChoices = primaryField ? primaryField.choices.map(function(item) {
        return item.title;
      }) : [];
      const secondaryField = form.fields.filter(function(field) {
        return field.name === form.variantField;
      }).shift();
      const secondaryChoices = secondaryField ? secondaryField.choices.map(function(choice) {
        return choice.title;
      }) : [];

      primaryChoices.reduce(function(o, primary) {
        if (form.style[primary] !== undefined && typeof form.style[primary] === 'object') {
          whitelistStyle[primary] = reduceStyle(form.style[primary]);

          secondaryChoices.reduce(function(o, secondary) {
            if (form.style[primary][secondary] !== undefined && typeof form.style[primary][secondary] === 'object') {
              whitelistStyle[primary][secondary] = reduceStyle(form.style[primary][secondary]);
            }
          }, whitelistStyle[primary]);
        }

      }, whitelistStyle);

      form.style = whitelistStyle;
    }

    req.form = form;
    next();
  }

  function reduceStyle(style) {
    return ['fill', 'fillOpacity', 'stroke', 'strokeOpacity', 'strokeWidth'].reduce(function(o, k) {
      if (style[k] !== undefined) o[k] = style[k];
      return o;
    }, {});
  }

  app.post(
    '/api/events',
    passport.authenticate('bearer'),
    access.authorize('CREATE_EVENT'),
    function(req, res, next) {
      new api.Event().createEvent(req.body, req.user, function(err, event) {
        if (err) {
          return next(err);
        }
        res.status(201).json(event);
      });
    }
  );

  app.get(
    '/api/events',
    passport.authenticate('bearer'),
    determineReadAccess,
    parseEventQueryParams,
    function (req, res, next) {
      const filter = {
        complete: req.parameters.complete
      };
      if (req.parameters.userId) filter.userId = req.parameters.userId;

      Event.getEvents({access: req.access, filter: filter, populate: req.parameters.populate, projection: req.parameters.projection}, function(err, events) {
        if (err) return next(err);

        res.json(events.map(function(event) {
          return event.toObject({access: req.access, projection: req.parameters.projection});
        }));
      });
    }
  );

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

        res.json(event.toObject({access: req.access, projection: req.parameters.projection}));
      });
    }
  );

  app.put(
    '/api/events/:eventId',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      new api.Event(req.event).updateEvent(req.body, {}, function(err, event) {
        if (err) {
          return next(err);
        }
        new api.Form(event).populateUserFields(function(err) {
          if (err) {
            return next(err);
          }
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
      new api.Event(req.event).deleteEvent(function(err) {
        if (err) return next(err);
        res.status(204).send();
      });
    }
  );

  app.post(
    '/api/events/:eventId/forms',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    upload.single('form'),
    function(req, res, next) {

      if (!req.is('multipart/form-data')) {
        return next();
      }

      function validateForm(callback) {
        new api.Form().validate(req.file, callback);
      }

      function updateEvent(form, callback) {
        form.name = req.param('name');
        form.color = req.param('color');
        new api.Event(req.event).addForm(form, function(err, form) {
          callback(err, form);
        });
      }

      function importIcons(form, callback) {
        new api.Form(req.event).importIcons(req.file, form, function(err) {
          callback(err, form);
        });
      }

      async.waterfall([
        validateForm,
        updateEvent,
        importIcons
      ], function (err, form) {
        if (err) {
          return next(err);
        }

        res.status(201).json(form);
      });
    }
  );

  app.post(
    '/api/events/:eventId/forms',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    parseForm,
    function(req, res, next) {
      const form = req.form;
      new api.Event(req.event).addForm(form, function(err, form) {
        if (err) return next(err);

        async.parallel([
          function(done) {
            new api.Icon(req.event._id, form._id).saveDefaultIconToEventForm(function(err) {
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
          res.status(201).json(form.toJSON());
        });
      });
    }
  );

  app.put(
    '/api/events/:eventId/forms/:formId',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    parseForm,
    function(req, res, next) {
      const form = req.form;
      form._id = parseInt(req.params.formId);
      new api.Event(req.event).updateForm(form, function(err, form) {
        if (err) return next(err);

        new api.Form(req.event, form).populateUserFields(function(err) {
          if (err) return next(err);

          res.json(form);
        });
      });
    }
  );

  // export a zip of the form json and icons
  // TODO: why not /api/events/:eventId/forms/:formId.zip?
  app.get(
    '/api/events/:eventId/:formId/form.zip',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Form(req.event).export(parseInt(req.params.formId, 10), function(err, form) {
        if (err) return next(err);

        res.attachment(req.event.name + "-" + form.name + "-form.zip");
        form.file.pipe(res);
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

  // TODO: this is a strangely named route for just getting the default icon.
  // the eventId parameter is not even used.
  app.get(
    '/api/events/:eventId/form/icons*',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res) {
      res.sendFile(api.Icon.defaultIconPath);
    }
  );

  app.get(
    '/api/events/:eventId/icons/:formId.json',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Icon(req.event._id, req.params.formId).getIcons(function(err, icons) {
        if (err) return next();

        async.map(icons, function(icon, done) {
          fs.readFile(icon.path, async function(err, data) {
            if (err) return done(err);

            let base64;
            const metadata = await fileType.fromBuffer(data);
            if (metadata) {
              base64 = util.format('data:%s;base64,%s', metadata.mime, Buffer(data).toString('base64'));
            }

            done(null, {
              eventId: icon.eventId,
              formId: icon.formId,
              primary: icon.primary,
              variant: icon.variant,
              icon: base64
            });
          });
        }, function(err, icons) {
          if (err) return next(err);

          res.json(icons);
        });
      });
    }
  );

  // Create a new icon
  // TODO: should be PUT?
  app.post(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    upload.single('icon'),
    function(req, res, next) {
      new api.Icon(req.event._id, req.params.formId, req.params.primary, req.params.variant).create(req.file, function(err, icon) {
        if (err) return next(err);

        return res.json(icon);
      });
    }
  );

  // get icon
  app.get(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Icon(req.event._id, req.params.formId, req.params.primary, req.params.variant).getIcon(function(err, icon) {
        if (err || !icon) return next();

        res.format({
          'image/*': function() {
            res.sendFile(icon.path);
          },
          'application/json': function() {
            fs.readFile(icon.path, async function(err, data) {
              if (err) return next(err);
              const dataType = await fileType.fromBuffer(data)
              res.json({
                eventId: icon.eventId,
                formId: icon.formId,
                primary: icon.primary,
                variant: icon.variant,
                icon: util.format('data:%s;base64,%s',  dataType.mime, Buffer(data).toString('base64'))
              });
            });
          }
        });
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

  app.get(
    '/api/events/:id/members',
    passport.authenticate('bearer'),
    determineReadAccess,
    function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      Event.getMembers(req.params.id, options).then(page => {
        if (!page) return res.status(404).send('Event not found');

        res.json(page);
      }).catch(err => next(err));
    }
  );

  app.get(
    '/api/events/:id/nonMembers',
    passport.authenticate('bearer'),
    determineReadAccess,
    function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      Event.getNonMembers(req.params.id, options).then(page => {
        if (!page) return res.status(404).send('Event not found');

        res.json(page);
      }).catch(err => next(err));
    }
  );

  app.get(
    '/api/events/:id/teams',
    passport.authenticate('bearer'),
    determineReadAccess,
    function (req, res, next) {
      if (req.query.page != null) {
        const options = {
          access: req.access,
          searchTerm: req.query.term,
          pageSize: parseInt(String(req.query.page_size)) || 2,
          pageIndex: parseInt(String(req.query.page)) || 0,
          includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
        }

        Event.getTeamsInEvent(req.params.id, options).then(page => {
          if (!page) return res.status(404).send('Event not found');

          res.json(page);
        }).catch(err => next(err));
      } else {
        let populate = null;
        if (req.query.populate) {
          populate = req.query.populate.split(",");
        }

        Event.getTeams(req.params.id, { populate: populate }, function (err, teams) {
          if (err) return next(err);

          res.json(teams.map(function (team) {
            return team.toObject({ access: req.access });
          }));
        });
      }
    }
  );

  app.get(
    '/api/events/:id/nonTeams',
    passport.authenticate('bearer'),
    determineReadAccess,
    function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      Event.getTeamsNotInEvent(req.params.id, options).then(page => {
        if (!page) return res.status(404).send('Event not found');

        res.json(page);
      }).catch(err => next(err));
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

  app.get(
    '/api/events/:eventId/users',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    determineReadAccess,
    function (req, res, next) {
      Event.getUsers(req.event._id, function(err, users) {
        if (err) return next(err);

        users = userTransformer.transform(users, {path: req.getRoot()});
        res.json(users);
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

  app.get(
    '/api/events/:eventId/teams',
    passport.authenticate('bearer'),
    authorizeAccess('READ_EVENT_ALL', 'read'),
    determineReadAccess,
    function (req, res, next) {
      let populate = null;
      if (req.query.populate) {
        populate = req.query.populate.split(",");
      }

      Event.getTeams(req.event._id, {populate: populate}, function(err, teams) {
        if (err) return next(err);

        res.json(teams.map(function(team) {
          return team.toObject({access: req.access});
        }));
      });
    }
  );

  app.delete(
    '/api/events/:eventId/teams/:teamId',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.removeTeam(req.event, req.team, function(err, event) {
        if (err) return next(err);

        res.json(event);
      });
    }
  );

  app.put(
    '/api/events/:eventId/acl/:targetUserId',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.updateUserInAcl(req.event._id, req.params.targetUserId, req.body.role, function(err, event) {
        if (err) return next(err);
        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/acl/:targetUserId',
    passport.authenticate('bearer'),
    authorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      Event.removeUserFromAcl(req.event._id, req.params.targetUserId, function(err, event) {
        if (err) return next(err);
        res.json(event);
      });
    }
  );
};
