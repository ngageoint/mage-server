module.exports = function(app, security) {
  var Form = require('../models/form')
    , api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , Zip = require('adm-zip');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/forms*', p***REMOVED***port.authenticate(authenticationStrategy));

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

  // TODO when we switch to events we need to change all the *_LAYER roles
  // to *_EVENT roles

  // get all forms
  app.get(
    '/api/forms',
    access.authorize('READ_LAYER'),
    function (req, res) {
      new api.Form().getAll(function (err, forms) {
        res.json(forms);
      });
    }
  );

  // export a zip of the form json and icons
  app.get(
    '/api/forms/:formId.zip',
    access.authorize('READ_LAYER'),
    function(req, res, next) {
      new api.Form().export(req.form, function(err, file) {
        res.attachment(req.form.name + ".zip");
        file.pipe(res);
      });
    }
  );

  // get form
  app.get(
    '/api/forms/:formId',
    access.authorize('READ_LAYER'),
    function (req, res) {
      res.json(req.form);
    }
  );

  // Import a form
  app.post(
    '/api/forms',
    access.authorize('CREATE_LAYER'),
    validateFormParams,
    function(req, res, next) {
      if (!req.is('multipart/form-data')) return next();

      new api.Form().import(req.files.form, function(err, form) {
        if (err) {
          console.log('form error', err);
          return res.send(400, err.message);
        }

        res.json(form);
      });
    }
  );

  // Create a new form
  app.post(
    '/api/forms',
    access.authorize('CREATE_LAYER'),
    validateFormParams,
    function(req, res) {
      new api.Form().create(req.newForm, function(err, form) {
        if (err) {
          return res.send(400, err.message);
        }

        res.json(form);
      });
    }
  );

  // Update a form
  app.put(
    '/api/forms/:formId',
    access.authorize('UPDATE_LAYER'),
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

  // Delete a form
  app.delete(
    '/api/forms/:id',
    access.authorize('DELETE_LAYER'),
    function(req, res) {
      new api.Form().delete(req.param('id'), function(err) {
        if (err) return res.send(400, "Could not delete form");

        res.send(204);
      });
    }
  );
}
