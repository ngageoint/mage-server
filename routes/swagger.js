module.exports = function(app, security) {
  var doc = require('../docs/swagger.json');

  app.get(
    '/api/api-docs',
    function(req, res, next) {
        res.json(doc);
    }
  );
}
