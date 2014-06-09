module.exports = function(app, security) {
  var Form = require('../models/form')
    , api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , Zip = require('adm-zip')
    , archiver = require('archiver');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/forms*', p***REMOVED***port.authenticate(authenticationStrategy));

  var validateFormParams = function(req, res, next) {
    var form = req.body;
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
        res.attachment("form.zip");
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
          return res.send(400, err);
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
          return res.send(400, err);
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
