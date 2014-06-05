module.exports = function(app, security) {
  var api = require('../api')
    , access = require('../access')
    , fs = require('fs-extra')
    , archiver = require('archiver');

  var p***REMOVED***port = security.authentication.p***REMOVED***port
    , authenticationStrategy = security.authentication.authenticationStrategy;

  app.all('/api/icons*', p***REMOVED***port.authenticate(authenticationStrategy));

  // TODO when we switch to events we need to change all the *_LAYER roles
  // to *_EVENT roles

  // get a zip of all icons
  app.get(
    '/api/icons/:formId.zip',
    access.authorize('READ_LAYER'),
    function(req, res, next) {
      var iconBasePath = new api.Icon(req.form).getBasePath();
      var archive = archiver('zip');
      res.attachment("icons.zip");
      archive.pipe(res);
      archive.bulk([{src: ['**'], dest: '/icons', expand: true, cwd: iconBasePath}]);
      archive.finalize();
    }
  );

  // get icon
  app.get(
    '/api/icons/:formId/:type?/:variant?',
    access.authorize('READ_LAYER'),
    function(req, res, next) {
      new api.Icon(req.form, req.params.type, req.params.variant).getIcon(function(err, iconPath) {
        if (err) return next(err);

        if (!iconPath) return res.send(404);

        console.log('getting image', iconPath);
        res.sendfile(iconPath);
      });
    }
  );

  // Create a new icon
  app.post(
    '/api/icons/:formId/:type?/:variant?',
    access.authorize('CREATE_LAYER'),
    function(req, res, next) {
      new api.Icon(req.form, req.params.type, req.params.variant).create(req.files.icon, function(err, icon) {
        if (err) return next(err);

        return res.json(icon);
      });
    }
  );

  // Delete an icon
  app.delete(
    '/api/icons/:formId/:type?/:variant?',
    access.authorize('DELETE_LAYER'),
    function(req, res) {
      new api.Icon(req.form, req.params.type, req.params.variant).delete(function(err, icon) {
        if (err) return next(err);

        return res.send(204);
      });
    }
  );
}
