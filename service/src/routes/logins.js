module.exports = function(app, security) {
  var access = require('../access')
    , moment = require('moment')
    , Login = require('../models/login')
    , passport = security.authentication.passport;

  app.all('/api/logins*', passport.authenticate('bearer'));

  function generateParameters(options) {
    var partial = "";

    if (options.filter.userId) {
      partial += '&userId=' + options.filter.userId;
    }

    if (options.filter.deviceId) {
      partial += '&deviceId=' + options.filter.deviceId;
    }

    if (options.filter.startDate) {
      partial += '&startDate=' + options.filter.startDate;
    }

    if (options.filter.endDate) {
      partial += '&endDate=' + options.filter.endDate;
    }

    if (options.limit) {
      partial += '&limit=' + options.limit;
    }

    return partial;
  }

  app.get(
    '/api/logins',
    access.authorize('READ_USER'),
    function(req, res, next) {
      var options = {};

      var limit = 10;
      if (req.query.limit && !isNaN(req.query.limit)) {
        limit = +req.query.limit;
      }
      options.limit = limit;

      options.lastLoginId = req.query.lastLoginId || null;
      options.firstLoginId = req.query.firstLoginId || null;

      var filter = {};
      if (req.query.userId) {
        filter.userId = req.query.userId;
      }
      if (req.query.deviceId) {
        filter.deviceId = req.query.deviceId;
      }
      if (req.query.startDate) {
        filter.startDate = moment(req.query.startDate).toDate();
      }
      if (req.query.endDate) {
        filter.endDate = moment(req.query.endDate).toDate();
      }
      options.filter = filter;

      Login.getLogins(options, function(err, logins) {
        if (err) return next(err);

        var response = {
          logins: logins
        };

        if (logins.length) {
          response.next = '/api/logins?lastLoginId=' + logins[logins.length - 1]._id;
          response.prev = '/api/logins?firstLoginId=' + logins[0]._id;

          var parameters = generateParameters(options);
          response.next += parameters;
          response.prev += parameters;
        }

        res.json(response);
      });
    }
  );

};
