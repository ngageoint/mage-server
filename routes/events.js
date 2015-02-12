module.exports = function(app, security) {
  var Event = require('../models/event')
  , access = require('../access')
  , api = require('../api')
  , archiver = require('archiver')
  , fs = require('fs-extra')
  , Zip = require('adm-zip');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
  , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/events*', p***REMOVED***port.authenticate(authenticationStrategy));

  var validateEventParams = function(req, res, next) {
    var event = req.body;

    if (!event.name) {
      return res.status(400).send("cannot create event 'name' param not specified");
    }

    req.newEvent = event;
    next();
  }

  var parseEventQueryParams = function(req, res, next) {
    var parameters = {};
    parameters.userId = req.param('userId');

    req.parameters = parameters;

    next();
  }

  var validateFormParams = function(req, res, next) {
    var form = req.body.form;

    // check for required fields
    var fields = form.fields;
    if (!fields) return res.status(400).send('fields is required');

    var fieldNames = {};
    fields.forEach(function(field) {
      fieldNames[field.name] = field;
    });

    var missing = [];
    if (fieldNames.timestamp == null) missing.push("'timestamp' missing field is required");
    if (fieldNames.geometry == null) missing.push("'geometry' missing field is required");
    if (fieldNames.type == null) missing.push("'type' missing field is required");
    if (missing.length) return res.status(400).send(missing.join(","));

    var required = [];
    if (!fieldNames.timestamp.required) required.push("'timestamp' required property must be true");
    if (!fieldNames.geometry.required) required.push("'geometry' required property must be true");
    if (!fieldNames.type.required) required.push("'type' required property must be true");
    if (required.length) return res.status(400).send(required.join(","));

    next();
  }

  app.get(
    '/api/events',
    access.authorize('READ_EVENT'),
    parseEventQueryParams,
    function (req, res) {
      Event.getEvents({userId: req.parameters.userId}, function (err, events) {
        res.json(events);
      });
    }
  );

  app.get(
    '/api/events/:eventId',
    access.authorize('READ_EVENT'),
    function (req, res) {
      res.json(req.event);
    }
  );

  app.post(
    '/api/events',
    access.authorize('CREATE_EVENT'),
    validateEventParams,
    function(req, res, next) {
      if (!req.is('multipart/form-data')) return next();

      if (req.files.teams) {
        var teams = fs.readFileSync(req.files.teams.path);
        req.newEvent.teams = JSON.parse(teams);
      }

      Event.create(req.newEvent, function(err, event) {
        if (err) return next(err);

        new api.Form(event).import(req.files.form, function(err, form) {
          if (err) return next(err);
          Event.update(event._id, {form: form}, function(err, event) {
            if (err) return next(err);

            res.status(201).json(event);
          });
        });
      });
    }
  );

  app.post(
    '/api/events',
    access.authorize('CREATE_EVENT'),
    validateEventParams,
    validateFormParams,
    function(req, res, next) {
      Event.create(req.newEvent, function(err, event) {
        if (err) return next(err);

        res.status(201).json(event);
      });
    }
  );

  app.put(
    '/api/events/:eventId',
    access.authorize('UPDATE_EVENT'),
    validateEventParams,
    function(req, res, next) {
      Event.update(req.event._id, req.newEvent, function(err, event) {
        if (err) return next(err);

        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId',
    access.authorize('DELETE_EVENT'),
    function(req, res, next) {
      Event.remove(req.event, function(err, event) {
        if (err) return next(err);

        res.status(204).send();
      });
    }
  );

  // export a zip of the form json and icons
  app.get(
    '/api/events/:eventId/form.zip',
    access.authorize('READ_EVENT'),
    function(req, res, next) {
      new api.Form(req.event).export(req.form, function(err, file) {
        if (err) return next(err);

        res.attachment(req.form.name + ".zip");
        file.pipe(res);
      });
    }
  );

  app.get(
    '/api/events/:eventId/form/icons.zip',
    access.authorize('READ_EVENT'),
    function(req, res, next) {
      var iconBasePath = new api.Icon(req.event._id).getBasePath();
      var archive = archiver('zip');
      res.attachment("icons.zip");
      archive.pipe(res);
      archive.bulk([{src: ['**'], dest: '/icons', expand: true, cwd: iconBasePath}]);
      archive.finalize();
    }
  );

  // get icon
  app.get(
    '/api/events/:eventId/form/icons/:type?/:variant?',
    access.authorize('READ_EVENT'),
    function(req, res, next) {
      new api.Icon(req.event._id, req.params.type, req.params.variant).getIcon(function(err, iconPath) {
        if (err || !iconPath) return next();

        res.sendFile(iconPath);
      });
    }
  );

  app.get(
    '/api/events/:eventId/form/icons*',
    access.authorize('READ_EVENT'),
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
    '/api/events/:eventId/form/icons/:type?/:variant?',
    access.authorize('CREATE_EVENT'),
    function(req, res, next) {
      new api.Icon(req.event._id, req.params.type, req.params.variant).create(req.files.icon, function(err, icon) {
        if (err) return next(err);

        return res.json(icon);
      });
    }
  );

  // Delete an icon
  app.delete(
    '/api/events/:eventId/form/icons/:type?/:variant?',
    access.authorize('DELETE_EVENT'),
    function(req, res) {
      new api.Icon(req.event._id, req.params.type, req.params.variant).delete(function(err, icon) {
        if (err) return next(err);

        return res.status(204).send();
      });
    }
  );
}
