module.exports = function(app, security) {
  var Event = require('../models/event')
  , access = require('../access')
  , api = require('../api')
  , fs = require('fs-extra')
  , Zip = require('adm-zip');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
  , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/events*', p***REMOVED***port.authenticate(authenticationStrategy));
  app.all('/api/forms*', p***REMOVED***port.authenticate(authenticationStrategy));

  var validateEventParams = function(req, res, next) {
    var event = req.body;

    if (!event.name) {
      return res.send(400, "cannot create event 'name' param not specified");
    }

    req.newEvent = event;
    next();
  }

  var parseEventQueryParams = function(req, res, next) {
    // var parameters = {};
    // parameters.type = req.param('type');
    //
    // req.parameters = parameters;

    next();
  }

  var validateFormParams = function(req, res, next) {
    var form = req.body;

    // check for required fields
    var fields = form.fields;
    if (!fields) return res.send(400, 'fields is required');

    var fieldNames = {};
    fields.forEach(function(field) {
      fieldNames[field.name] = field;
    });

    var missing = [];
    if (fieldNames.timestamp == null) missing.push("'timestamp' missing field is required");
    if (fieldNames.geometry == null) missing.push("'geometry' missing field is required");
    if (fieldNames.type == null) missing.push("'type' missing field is required");
    if (missing.length) return res.send(400, missing.join(","));

    var required = [];
    if (!fieldNames.timestamp.required) required.push("'timestamp' required property must be true");
    if (!fieldNames.geometry.required) required.push("'geometry' required property must be true");
    if (!fieldNames.type.required) required.push("'type' required property must be true");
    if (required.length) return res.send(400, required.join(","));

    req.newForm = form;
    next();
  }

  app.get(
    '/api/events',
    access.authorize('READ_EVENT'),
    parseEventQueryParams,
    function (req, res) {
      Event.getEvents({}, function (err, events) {
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
    function(req, res) {
      Event.create(req.newEvent, function(err, event) {
        if (err) {
          return res.send(400, err);
        }

        res.send(201, event);
      });
    }
  );

  app.put(
    '/api/events/:eventId',
    access.authorize('UPDATE_EVENT'),
    validateEventParams,
    function(req, res) {
      Event.update(req.event.id, req.newEvent, function(err, event) {
        if (err) {
          return res.send(400, err);
        }

        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId',
    access.authorize('DELETE_EVENT'),
    function(req, res) {
      Event.remove(req.event, function(err, event) {
        if (err) {
          return res.send(400, err);
        }

        res.send(204);
      });
    }
  );

  // export a zip of the form json and icons
  app.get(
    '/api/events/:eventId/form.zip',
    access.authorize('READ_EVENT'),
    function(req, res, next) {
      new api.Form(req.event).export(req.form, function(err, file) {
        res.attachment(req.form.name + ".zip");
        file.pipe(res);
      });
    }
  );

  // get form for a specific event
  app.get(
    '/api/events/:eventId/form',
    access.authorize('READ_EVENT'),
    function (req, res) {
      Event.getForm(function(err, form) {
        if (!form) return res.send('Form not found', 404);

        return res.json(form);
      });
    }
  );

  // Import a form into a specific event
  app.put(
    '/api/events/:eventId/form',
    access.authorize('CREATE_EVENT'),
    function(req, res, next) {
      if (!req.is('multipart/form-data')) return next();

      new api.Form().import(req.files.form, function(err, form) {
        if (err) {
          console.log('form error', err);
          return res.send(400, err.message);
        }

        Event.setForm(req.event, form, function(err, event) {
          res.json(form);
        });
      });
    }
  );

  // Update a form for an event
  app.put(
    '/api/events/:eventId/form',
    access.authorize('UPDATE_EVENT'),
    validateFormParams,
    function(req, res) {
      new api.Form().update(req.form.id, req.newForm, function(err, form) {
        if (err) {
          return res.send(400, err);
        }

        res.json(form);
      });
    }
  );
}
