var User     = require('../models/user');
var Location = require('../models/location');
var express  = require('express');
var mongoose = require('mongoose');
var config   = require('../config.json');
var path     = require('path');
var async    = require("async");


process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});


// Configure authentication
var auth = require('../auth/authentication')({
  authenticationStrategy: config.server.authentication.strategy,
  provisionStrategy: config.server.provision.strategy
});
console.log('Authentication: ' + auth.authenticationStrategy);
console.log('Provision: ' + auth.provisionStrategy);


// Configuration of the MAGE Express server
var app = express();
var mongodbConfig = config.server.mongodb;
app.configure(function () {
  mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
    if (err) {
      console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
      throw err;
    }
  });
  mongoose.set('debug', true);

  app.set('config', config);

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(auth.p***REMOVED***port.initialize());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, "public")));
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Internal server error, please contact MAGE administrator.');
  });
});

var mode                = process.argv[2];
var numUsers            = process.argv[3];
var numLocationsPerUser = process.argv[4];

var username  = "aovechkin";
var firstname = "Alex@nder";
var lastname  = "0vechkin";
var email     = "ao@washingtoncapitals.com";
var p***REMOVED***word  = "testp***REMOVED***word";


var deleteUsers = function() {
  User.getUsers(function(users) {
  for(var i in users) {
	  var user = users[i];
	  var testUser = user.firstname.indexOf(firstname) != -1 &&
	                 user.lastname.indexOf(lastname) != -1 &&
	                 user.username.indexOf(username) != -1 &&
	                 user.email.indexOf(email) != -1;  
      if(testUser) {     
      	User.deleteUser(user._id, function(err){          
          if(err) {
            console.log('Unable to delete user: ' + err);            
      	  }
      	});
      }
	}
  });
}

var createUsers = function() {
  console.log('create test users...');
  for(var i = 1; i <= numUsers; i++) {

	var user = {
      username: username+i,
      firstname: firstname+i,
      lastname: lastname+i,
      email: i+email,
      p***REMOVED***word: i+p***REMOVED***word
	}

	User.createUser (user, function(err, user){
	  if(err) {
	    console.log(err);
	    return
	  }

      var locations = [];

	  for(var j = 0; j < numLocationsPerUser; j++){
        
        var x = Math.random()*10 + 30.0;
        var y = -(Math.random()*10 + 100.0);

	    var location = {
	  	  type: "Feature",
	  	  geometry: {type: "Point",coordinates: [y,x]},
	  	  properties: {timestamp: new Date(), user: user._id}
	    };

	  	locations[j] = location;

	  }

      Location.createLocations(user, locations, function(err, locationsResponse) {
        if (err) {
          console.log(err);
        }
      });

      User.addLocationsForUser(user, locations, function(err, userLocationsResponse) {
        if (err) {
          console.log(err);
        }
      });

	});    
  }
}

if(mode == 'clean') {
  console.log('****************************************************');
  console.log('**DELETING TEST USERS*******************************');
  console.log('****************************************************');
  deleteUsers();
}
else if(mode == 'create') {
  console.log('****************************************************');
  console.log('**CREATING TEST USERS*******************************');
  console.log('****************************************************');
  createUsers();
} 
else {
  console.log('\nProper Usage:');
  console.log('node populateData.js clean');
  console.log('node populateData.js create <number of users> <number of locations per user>\n');
}



