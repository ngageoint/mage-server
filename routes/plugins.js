module.exports = function (app, security) {
  const fs = require('fs')
    , path = require('path')
    , access = require('../access')
    , passport = security.authentication.passport;

  app.get(
    '/api/plugins',
    passport.authenticate('bearer'),
    access.authorize('READ_SETTINGS'), // TODO add new permission
    function (req, res, next) {
      console.log('get plugins');

      // TODO read file system or database
      // for now just serve out the plugin I know is there

      res.json([{
        name: 'mage-image',
        title: 'Image Rotation',
        description: 'Purple',
        url: 'api/plugins/mage-image'
      }]);
    }
  );

  app.get(
    '/api/plugins/:name',
    function (req, res, next) {
      console.log('get plugin', req.params.name);
      // TODO serve out correct plugin based on 'name'
      // res.sendFile(path.resolve('plugins/mage-image/app/dist/image/bundles/image.umd.js'));

      fs.readFile(path.resolve('plugins/mage-image/app/dist/image/bundles/image.umd.js'), "utf8", function (err, data) {
        console.log('send as file', data);
        res.set({ 
          'Content-Disposition': 'attachment; filename=module.js'
        });
        res.send(data);
      });

    }
  );

};