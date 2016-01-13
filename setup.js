'use strict;';

var async  = require('async'),
    util   = require('util'),
    config = require('./config'),
    Device = require('./models/device'),
    Role   = require('./models/role'),
    User   = require('./models/user'),
    Layer  = require('./models/layer'),
    log    = require('./logger');

var setup = function() {
  need_setup( function(err, result) {
    console.log(util.inspect(result));
    if( result ) {
      log.info('Running initial setup');
      async.series([
        install_device(config.defaults.device),
        install_roles(config.defaults.roles),
        //install_user(config.defaults.user),
        install_layer(config.defaults.layers),
      ], function(err, results) {
        if( err ) {
          throw err;
        }
        return true;
      });
    } else {
      return true;
    }
  });
};

var need_setup = function(callback) {
  var _callback = ('function' === typeof callback) ? callback : function(){} ;

  Device.count(function(err, devicecount) {
    if( err ) {
      log.info("Unable to detect database objects for setup");
      _callback(err, false);
    }
    _callback({}, (devicecount > 0) ? false : true);
    //return (devicecount > 0) ? false : true;
  });
};

var install_device = function(device) {
  Device.createDevice(device, function(){} );
  log.info('Created default device ' + device.uid);
};

var install_roles = function(roles, callback) {
  async.forEach(roles, Role.createRole, function() {
    log.info('Created ' + roles.length + ' default roles');
    install_user(config.defaults.user);
  });
};

var install_user = function(user) {
  Role.getRole('ADMIN_ROLE', function(err, adminrole){
    if( err || !adminrole ) {
      log.info(util.inspect(adminrole));
      throw 'Unable to get ADMIN_ROLE to apply to default user \'' + user.username + '\'';
    }

    var _user = user;
    _user.roleId = adminrole._id;
    User.createUser(_user, function(err, newuser) {
      log.info('Created default user: ' + newuser.username);
    });
  });
};

var install_layer = function(layers) {
  layers.forEach( function(layer) {
    Layer.create(layer, function(err, newlayer) {
      log.info('Created new default layer: ' + newlayer.name);
    });
  });
};

module.exports = setup;
