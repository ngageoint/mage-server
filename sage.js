var express = require("express");
var mongoose = require('mongoose');
var path = require("path");
var fs = require('fs');

var app = express();

var dbPath = 'mongodb://localhost/sagedb';

// Configuration of the SAGE Express server
app.configure(function () {
  mongoose.connect(dbPath, function(err) {
    if (err) throw err;
  });

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, "public")));
  app.use('/extjs', express.static(path.join(__dirname, "extjs")));
  app.use('/geoext', express.static(path.join(__dirname, "geoext")));
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Internal server error.');
  });
});

// Import models
var models = {
  Feature: require('./models/feature')(mongoose),
  Team: require('./models/team')(mongoose),
  ObservationLevel: require('./models/observationlevel')(mongoose),
  ObservationType: require('./models/observationtype')(mongoose)
}

// Dynamically import all routes
fs.readdirSync('routes').forEach(function(file) {
  if (file[0] == '.') return;
  var route = file.substr(0, file.indexOf('.'));
  require('./routes/' + route)(app, models, fs);
});

// Gets all the Teams with universal JSON formatting    
app.get('/api/v1/teams', function (req, res){
  console.log("SAGE Team GET REST Service Requested");
  return models.TeamModel.find({}, function (err, teams) {
    if( err || !teams.length) {
      console.log("No teams were found.");  
      res.send("No teams were found.");
    }
    else {
      res.send(teams);
    };
  });
});

// Gets all the Observation Levels with universal JSON formatting   
app.get('/api/v1/observationLevels', function (req, res){
  console.log("SAGE Observation Levels GET REST Service Requested");
  return models.ObservationLevelModel.find({}, function (err, observation_levels) {
    if( err || !observation_levels.length) {
      console.log("No observation levels were found."); 
      res.send("No observation levels were found.");
    }
    else {
      res.send(observation_levels);
    };
  });
});

// Gets all the Observation Types with universal JSON formatting    
app.get('/api/v1/observationTypes', function (req, res){
  console.log("SAGE Observation Types GET REST Service Requested");
  return models.ObservationTypeModel.find({}, function (err, observation_types) {
    if( err || !observation_types.length) {
      console.log("No observation types were found.");  
      res.send("No observation types were found.");
    }
    else {
      res.send(observation_types);
    };
  });
});

// Launches the Node.js Express Server
app.listen(4242);
console.log('SAGE Node Server: Started listening on port 4242.');