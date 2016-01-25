module.exports = function(app) {
  var doc = require('../docs/swagger.json');

  app.get(
    '/api/api-docs',
    function(req, res) {
        res.json(doc);
    }
  );
};
