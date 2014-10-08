(function() {
  var Pool, async, noop, _;

  _ = require('lodash');

  async = require('async');

  noop = function() {};

  module.exports = Pool = (function() {
    function Pool(params) {
      this.connections = [];
      this.create = params.create;
      this.max = params.max || 5;
      this.success = params.success || noop;
      this.connect();
    }

    Pool.prototype.connect = function() {
      return async.times(this.max, (function(_this) {
        return function(n, next) {
          return _this.create(function(err, conn) {
            if (err) {
              console.error("Mongo Pool conn " + n + ": error", err);
            } else {
              _this.connections.push(conn);
            }
            return next(err, conn);
          });
        };
      })(this), (function(_this) {
        return function(err, connections) {
          return _this.success(err);
        };
      })(this));
    };

    Pool.prototype.close = function(cb) {
      return async.each(this.connections, function(conn, callback) {
        return conn.close(false, callback);
      }, cb);
    };

    Pool.prototype.acquire = function() {
      var clientId;
      if (this.connections.length > 0) {
        clientId = _.random(0, this.connections.length - 1);
        return this.connections[clientId];
      }
    };

    return Pool;

  })();

}).call(this);
