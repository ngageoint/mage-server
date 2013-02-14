var application_root = __dirname;
var express = require("express");
var path = require("path");
var mongoose = require('mongoose');
var app = express();
var fs = require('fs');

var url = require('url');

var qs = require('querystring');

var formidable = require('formidable');

// Database connection to the SAGE MongoDB database
mongoose.connect('mongodb://localhost/sagedb', function(err) {
    if (!err) console.log("Connection to database successful.");
	
});

// Configuration of the SAGE Express server
app.configure(function () {
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(application_root, "public")));
	app.use('/uploads', express.static(path.join(application_root, "uploads")));
	app.use('/extjs', express.static(path.join(application_root, "extjs")));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	app.use(function(err, req, res, next){
		console.error(err.stack);
		res.send(500, 'Something broke!');
	});
});

function QueryData(queryString, preserveDuplicates){

  // if a query string wasn't specified, use the query string from the URL
  if (queryString == undefined){
    queryString = 'defined=false';
  }
  // remove the leading question mark from the query string if it is present
  if (queryString.charAt(0) == '?') queryString = queryString.substring(1);
  // check whether the query string is empty
  if (queryString.length > 0){
    // replace plus signs in the query string with spaces
    queryString = queryString.replace(/\+/g, ' ');
    // split the query string around ampersands and semicolons
    var queryComponents = queryString.split(/[&;]/g);
    // loop over the query string components
    for (var index = 0; index < queryComponents.length; index ++){
      // extract this component's key-value pair
      var keyValuePair = queryComponents[index].split('=');
      var key          = decodeURIComponent(keyValuePair[0]);
      var value        = keyValuePair.length > 1
                       ? decodeURIComponent(keyValuePair[1])
                       : '';
      // check whether duplicates should be preserved
      if (preserveDuplicates){
        // create the value array if necessary and store the value
        if (!(key in this)) this[key] = [];
        this[key].push(value);
      }else{
        // store the value
        this[key] = value;
      }
    }
  }
}

// Used to mimic the ESRI style of the JSON header area
var esriHeaders = "\"objectIdFieldName\": \"OBJECTID\", \"globalIdFieldName\": \"\", \"geometryType\": \"esriGeometryPoint\", \"spatialReference\": {\"wkid\": 4326}";

// Used to mimic the ESRI style of the JSON fields area
var esriFields = "[{\"name\":\"OBJECTID\",\"alias\":\"OBJECTID\",\"type\": \"esriFieldTypeOID\"  },  {\"name\": \"ADDRESS\",   \"alias\": \"ADDRESS\",   \"type\": \"esriFieldTypeString\",   \"length\": 255  },  {   \"name\": \"EVENTDATE\",   \"alias\": \"EVENTDATE\",   \"type\": \"esriFieldTypeDate\",   \"length\": 36  },  {   \"name\": \"TYPE\",   \"alias\": \"TYPE\",   \"type\": \"esriFieldTypeString\",   \"length\": 50  },  {   \"name\": \"EVENTLEVEL\",   \"alias\": \"LEVEL\",   \"type\": \"esriFieldTypeString\",   \"length\": 50  },  {   \"name\": \"TEAM\",   \"alias\": \"TEAM\",   \"type\": \"esriFieldTypeString\",   \"length\": 50  },  {   \"name\": \"DESCRIPTION\",   \"alias\": \"DESCRIPTION\",   \"type\": \"esriFieldTypeString\",   \"length\": 1073741822  },  {   \"name\": \"USNG\",   \"alias\": \"USNG\",   \"type\": \"esriFieldTypeString\",   \"length\": 255  },  {   \"name\": \"EVENTCLEAR\",   \"alias\": \"EVENTCLEAR\",   \"type\": \"esriFieldTypeDate\",   \"length\": 36  },  {   \"name\": \"UNIT\",   \"alias\": \"UNIT\",   \"type\": \"esriFieldTypeString\",   \"length\": 100  } ]";

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;  

// Creates the Schema for the Features object (mimics ESRI)
var Feature = new Schema({  
    geometry: {
		x: { type: Number, required: false },  
		y: { type: Number, required: false }
	},  
    attributes: {
	    OBJECTID: { type: Number, required: false },  
		ADDRESS: { type: String, required: false},  
		EVENTDATE: { type: Number, unique: false },  
		TYPE: { type: String, required: false },  
		EVENTLEVEL: { type: String, required: false },  
		TEAM: { type: String, unique: false }, 
		DESCRIPTION: { type: String, required: false },  
		USNG: { type: String, required: false },  
		EVENTCLEAR: { type: Number, unique: false },
		UNIT: { type: String, required: false }
	}}, 
	{ versionKey: false }
);

// Creates the Schema for the Attachments object (mimics ESRI)
var Attachment = new Schema({  
	    id: { type: Number, required: false },  
		contentType: { type: String, required: false },  
		size: { type: String, required: false },  
		name: { type: String, required: false },
		OBJECTID: { type: String, required: false }
	},   
	{ versionKey: false }
);

// Creates the Schema for the Teams object
var Team = new Schema({ 
		team_name: { type: String, required: false }
	},   
	{ versionKey: false }
);

// Creates the Schema for the Observation Level object
var ObservationLevel = new Schema({ 
		observation_level: { type: String, required: false }
	},   
	{ versionKey: false }
);

// Creates the Schema for the Observation Type object
var ObservationType = new Schema({ 
		observation_type: { type: String, required: false }
	},   
	{ versionKey: false }
);

// Creates the Model for the Features Schema
var FeatureModel = mongoose.model('Feature', Feature);

// Creates the Model for the Attachments Schema
var AttachmentModel = mongoose.model('Attachment', Attachment);  

// Creates the Model for the Attachments Schema
var TeamModel = mongoose.model('Team', Team);  

// Creates the Model for the Attachments Schema
var ObservationLevelModel = mongoose.model('ObservationLevel', ObservationLevel);  

// Creates the Model for the Attachments Schema
var ObservationTypeModel = mongoose.model('ObservationType', ObservationType);  

// Gets all the Teams with universal JSON formatting		
app.get('/api/v1/teams', function (req, res){
	return console.log("SAGE Team GET REST Service Requested");
	return TeamModel.find({}, function (err, teams) {
		if( err || !teams.length) {
			console.log("No teams were found.");	
			return res.send("No teams were found.");
		}
		else {
			return res.send(teams);
		};
	});
});

// Gets all the Observation Levels with universal JSON formatting		
app.get('/api/v1/observationLevels', function (req, res){
	return console.log("SAGE Observation Levels GET REST Service Requested");
	return ObservationLevelModel.find({}, function (err, observation_levels) {
		if( err || !observation_levels.length) {
			console.log("No observation levels were found.");	
			return res.send("No observation levels were found.");
		}
		else {
			return res.send(observation_levels);
		};
	});
});

// Gets all the Observation Types with universal JSON formatting		
app.get('/api/v1/observationTypes', function (req, res){
	return console.log("SAGE Observation Types GET REST Service Requested");
	return ObservationTypeModel.find({}, function (err, observation_types) {
		if( err || !observation_types.length) {
			console.log("No observation types were found.");	
			return res.send("No observation types were found.");
		}
		else {
			return res.send(observation_types);
		};
	});
});

// Gets the base API page
app.get('/api', function (req, res) {
	return console.log("SAGE API GET REST Service Requested");

	var body = '<html>'+
	'<head>'+
	'<meta http-equiv="Content-Type" content="text/html; '+
	'charset=UTF-8" />'+
	'<title>SAGE REST Services API Versions</title>'+
	'</head>'+
	'<body style="text-align:center">' +
	'<p><img src="images/sage_leaf.jpg" width="200" height="200" alt="Sage Leaves" /></p>' +
	'<p>You are looking at the base of the SAGE Server REST Services.</p>' +
	'<p>The current version of the REST Services is: &quot;v1&quot;</p>' +
	'<p><a href="api/v1">SAGE RESTful API Services v1</a></p>' +
	'<p>&nbsp;</p>' +
	'</body>' +
	'</html>';
	
	res.send(body);
});

// Gets the API versioning page
app.get('/api/v1', function (req, res) {
	return console.log("SAGE APT V1 GET REST Service Requested");

	var body = '<html>'+
		'<head>'+
		'<meta http-equiv="Content-Type" content="text/html; '+
		'charset=UTF-8" />'+
		'<title>SAGE REST Services API v1 Documentation</title>'+
		'</head>'+	
		'<body style="text-align: center;">'+
		'<p>http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/api/v1/features/</p>'+
		'<p>GET</p>'+
		'<p>POST</p>'+
		'<p>http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/api/v1/features/:id</p>'+
		'<p>PUT(update)</p>'+
		'<p>DELETE</p>'+
		'<p>http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/api/v1/esriFeatures/</p>'+
		'<p>GET</p>'+
		'<p>POST</p>'+
		'<p>http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/api/v1/esriFeatures/:id</p>'+
		'<p>PUT(update)</p>'+
		'<p>DELETE</p>'+
		'<p style="color: #F00;">http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/api/v1/esriFeatures/:id/addAttachment</p>'+
		'<p style="color: #F00;">http://ec2-50-16-12-98.compute-1.amazonaws.com/sage/api/v1/esriFeatures/:id/deleteAttachment</p>'+
		'</body>' +
		'</html>';
	res.send(body);

});

// Gets all the features with universal JSON formatting		
app.get('/api/v1/features', function (req, res){
	return console.log("SAGE Features GET REST Service Requested");
	return FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {
		if( err || !features.length) {
			console.log("No records were found.");	
			return res.send("No records were found.");
		}
		else {
			return res.send(features);
		};
	});
});

// This function gets one feature with universal JSON formatting	
app.get('/api/v1/features/:id', function (req, res){
	return console.log("SAGE Features (ID) GET REST Service Requested");
	return FeatureModel.findById(req.params.id, function (err, feature) {
		if (!err) {
			return res.send(feature);
		} else {
			return console.log(err);
		}
	});
}); 

// This function creates a new Feature	
app.post('/api/v1/features', function (req, res){
	return console.log("SAGE Features POST REST Service Requested");
	
	return FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {
		if (!err) {
			
			var newID;
			var maxID = 0;
						
			// Gets the Max OBJECTID from the Features Table
			features.forEach( function(allESRIRecords) {
				if (maxID < allESRIRecords.attributes.OBJECTID) {
					maxID = allESRIRecords.attributes.OBJECTID
				}
			});
			
			newID = maxID + 1;
			
			return res.send(""+maxID);
			
		} else {
			return res.send(err);
		};
	});
	
	var feature;
	console.log("POST: ");
	console.log(req.body);
	
	feature = new FeatureModel({
		geometry: {
			x: req.body.x,
			y: req.body.y
		},
		attributes: {
			OBJECTID: maxID,  
			ADDRESS: req.body.ADDRESS,  
			EVENTDATE: req.body.EVENTDATE,  
			TYPE: req.body.TYPE,  
			EVENTLEVEL: req.body.EVENTLEVEL,  
			TEAM: req.body.TEAM, 
			DESCRIPTION: req.body.DESCRIPTION,  
			USNG: req.body.USNG,  
			EVENTCLEAR: req.body.EVENTCLEAR,
			UNIT: req.body.UNIT
		}

	});
	feature.save(function (err) {
		if (!err) {
			return console.log("Feature with ID: " + feature.id + " created.");
		} else {
			return console.log(err);
		}
	});
	return res.send(feature);
}); 


// This function will update a feature by the ID
app.put('/api/v1/features/:id', function (req, res){
	return console.log("SAGE Features (ID) UPDATE REST Service Requested");
	
	return FeatureModel.findById(req.params.id, function (err, feature) {	
		
		feature.geometry.x = req.body.x;
		feature.geometry.y = req.body.y;
		feature.attributes.OBJECTID = req.body.OBJECTID;
		feature.attributes.ADDRESS = req.body.ADDRESS;
		feature.attributes.EVENTDATE = req.body.EVENTDATE;  
		feature.attributes.TYPE = req.body.TYPE;  
		feature.attributes.EVENTLEVEL = req.body.EVENTLEVEL;
		feature.attributes.TEAM = req.body.TEAM;
		feature.attributes.DESCRIPTION = req.body.DESCRIPTION; 
		feature.attributes.USNG = req.body.USNG;
		feature.attributes.EVENTCLEAR = req.body.EVENTCLEAR;
		feature.attributes.UNIT = req.body.UNIT;
		
		return feature.save(function (err) {
			if (!err) {
				console.log("updated");
			} else {
				console.log(err);
			}
		return res.send(feature);
		});
	});
}); 

// This function deletes one feature based on ID
app.delete('/api/v1/features/:id', function (req, res){
	return console.log("SAGE Features (ID) DELETE REST Service Requested");

	return FeatureModel.findById(req.params.id, function (err, feature) {
		return product.remove(function (err) {
			if (!err) {
				console.log("Feature with ID: " + req.params.id + " deleted.");
				return res.send('');
			} else {
				console.log(err);
			}
		});
	});
}); 


// Gets all the ESRI Styled records built for the ESRI format and syntax
app.get('/api/v1/esriFeatures', function (req, res){
	return console.log("SAGE ESRI Features GET REST Service Requested");

		
	return FeatureModel.find({}, {'_id': 0}, function (err, features) {
		
		var esriStringBegin = "{" + esriHeaders + ", \"fields\": " + esriFields + ", \"features\": [";
		var esriStringEnd = "]}";
		var fullString = "";
		var indGeometry = "";
		var indAttributes = "";
		
		fullString = esriStringBegin;
		
		var count = 0;

		if( err || !features.length) {
			console.log("No records were found.");
			return res.send("{\"objectIdFieldName\": \"OBJECTID\",\"globalIdFieldName\": \"\",\"features\": []}");	
			
			
		}
		else {
			features.forEach( function(allESRIRecords) {
				
				count = count + 1;
				
				indGeometry = "\"geometry\": { \"x\": " + allESRIRecords.geometry.x + ", \"y\": " + allESRIRecords.geometry.y + "}";
				
				indAttributes = "\"attributes\": { \"OBJECTID\": " + allESRIRecords.attributes.OBJECTID + ", " +
					"\"ADDRESS\": \"" + allESRIRecords.attributes.ADDRESS + "\", " +
					"\"EVENTDATE\": " + allESRIRecords.attributes.EVENTDATE + ", " +
					"\"TYPE\": \"" + allESRIRecords.attributes.TYPE + "\", " +
					"\"EVENTLEVEL\": \"" + allESRIRecords.attributes.EVENTLEVEL + "\", " +
					"\"TEAM\": \"" + allESRIRecords.attributes.TEAM + "\", " +
					"\"DESCRIPTION\": \"" + allESRIRecords.attributes.DESCRIPTION + "\", " +
					"\"USNG\": \"" + allESRIRecords.attributes.USNG + "\", " +
					"\"EVENTCLEAR\": \"" + allESRIRecords.attributes.EVENTCLEAR + "\", " +
					"\"UNIT\": \"" + allESRIRecords.attributes.UNIT + "\"" +
					"}";
				
				fullString = fullString + "{" + indGeometry + ", " + indAttributes + "}";
				
				if (count < features.length) {
					fullString = fullString + ", ";
				}
			})
				
			fullString = fullString + esriStringEnd;
		
			return res.send(fullString);
		};
	});
}); 

// Gets one ESRI Styled record built for the ESRI format and syntax
app.get('/api/v1/esriFeatures/:id', function (req, res){
	return console.log("SAGE ESRI Features (ID) GET REST Service Requested");

	return FeatureModel.find({"attributes.OBJECTID": req.params.id}, {'_id': 0}, function (err, feature) {
		
		var esriStringBegin = "{" + esriHeaders + ", \"fields\": " + esriFields + ", \"features\": [";
		var esriStringEnd = "]}";
		var fullString = "";
		var indGeometry = "";
		var indAttributes = "";
		
		fullString = esriStringBegin;
		
		var count = 0;

		if( err ) {
			//console.log("No records were found.");
			//return res.send("No records were found.");	
			return res.send(""+err);	
		}
		else {				
				indGeometry = "\"geometry\": { \"x\": " + feature.geometry.x + ", \"y\": " + feature.geometry.y + "}";
				
				indAttributes = "\"attributes\": { \"OBJECTID\": " + feature.attributes.OBJECTID + ", " +
					"\"ADDRESS\": \"" + feature.attributes.ADDRESS + "\", " +
					"\"EVENTDATE\": " + feature.attributes.EVENTDATE + ", " +
					"\"TYPE\": \"" + feature.attributes.TYPE + "\", " +
					"\"EVENTLEVEL\": \"" + feature.attributes.EVENTLEVEL + "\", " +
					"\"TEAM\": \"" + feature.attributes.TEAM + "\", " +
					"\"DESCRIPTION\": \"" + feature.attributes.DESCRIPTION + "\", " +
					"\"USNG\": \"" + feature.attributes.USNG + "\", " +
					"\"EVENTCLEAR\": \"" + feature.attributes.EVENTCLEAR + "\", " +
					"\"UNIT\": \"" + feature.attributes.UNIT + "\"" +
					"}";
				
				fullString = fullString + "{" + indGeometry + ", " + indAttributes + "}";
		
			fullString = fullString + esriStringEnd;
		
			return res.send(fullString);
		};
	});
}); 

// This function creates a new ESRI Style Feature	
app.post('/api/v1/esriFeatures/', function(req, res) {
	return console.log("SAGE ESRI Features POST REST Service Requested");

	
	var queryParams = new QueryData(url.parse(req.url).query);
	
	var postData = JSON.parse(queryParams.features);

	FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {

		var newID;
		var maxID = 1;

		// Gets the Max OBJECTID from the Features Table
		features.forEach( function(allESRIRecords) {
			if (maxID <= allESRIRecords.attributes.OBJECTID) {
				maxID = allESRIRecords.attributes.OBJECTID + 1
			}
		});
		newID =  maxID;
		console.log(newID);


	var feature;

	if (postData[0].geometry.x != undefined) {
		var x = postData[0].geometry.x;
	} else {
		var x = "";
	}
	
	if (postData[0].geometry.x != undefined) {
		var y = postData[0].geometry.x;
	} else {
		var y = "";
	}
	
	if (postData[0].attributes.ADDRESS != undefined) {
		var address = postData[0].attributes.ADDRESS;
	} else {
		var address = "";
	}
	
	if (postData[0].attributes.EVENTDATE != undefined) {
		var eventDate = postData[0].attributes.EVENTDATE;
	} else {
		var eventDate = "";
	}
	
	if (postData[0].attributes.TYPE != undefined) {
		var type = postData[0].attributes.TYPE;
	} else {
		var type = "";
	}
	
	if (postData[0].attributes.EVENTLEVEL != undefined) {
		var eventLevel = postData[0].attributes.EVENTLEVEL;
	} else {
		var eventLevel = "";
	}
	
	if (postData[0].attributes.TEAM != undefined) {
		var team = postData[0].attributes.TEAM;
	} else {
		var team = "";
	}
	
	if (postData[0].attributes.DESCRIPTION != undefined) {
		var description = postData[0].attributes.DESCRIPTION;
	} else {
		var description = "";
	}
	
	if (postData[0].attributes.USNG != undefined) {
		var usng = postData[0].attributes.USNG;
	} else {
		var usng = "";
	}
	
	if (postData[0].attributes.EVENTCLEAR != undefined) {
		var eventClear = postData[0].attributes.EVENTCLEAR;
	} else {
		var eventClear = "";
	}
	
	if (postData[0].attributes.UNIT != undefined) {
		var theUnit = postData[0].attributes.UNIT;
	} else {
		var theUnit = "";
	}


	feature = new FeatureModel({
		geometry: {
			x: postData[0].geometry.x,
			y: postData[0].geometry.y
		},
		attributes: {
			OBJECTID: newID,  
			ADDRESS: address,  
			EVENTDATE: eventDate,  
			TYPE: type,  
			EVENTLEVEL: eventLevel,  
			TEAM: team, 
			DESCRIPTION: description,  
			USNG: usng,  
			EVENTCLEAR: eventClear,
			UNIT: theUnit
		}

	});
		
//	feature = new FeatureModel({
//		geometry: {
//			x: req.body.x,
//			y: req.body.y
//		},
//		attributes: {
//			OBJECTID: newID,  
//			ADDRESS: req.body.ADDRESS,  
//			EVENTDATE: 12345678,  
//			TYPE: req.body.TYPE,  
//			EVENTLEVEL: req.body.EVENTLEVEL,  
//			TEAM: req.body.TEAM, 
//			DESCRIPTION: req.body.DESCRIPTION,  
//			USNG: req.body.USNG,  
//			EVENTCLEAR: req.body.EVENTCLEAR,
//			UNIT: req.body.UNIT
//		}
//
//	});
	
	feature.save(function (err) {
		if (!err) {
			return console.log(req.body);
		} else {
			return console.log(err);
		}
	});
	
	return res.send(feature);

	});
});

// This function gets all the attachments for a particular ESRI record	
app.get('/api/v1/esriFeatures/:id/attachments', function(req, res){
	return console.log("SAGE ESRI Features (ID) Attachments GET REST Service Requested");

	return AttachmentModel.find({OBJECTID: req.params.id}, function (err, attachments) {
			
		var attachmentStringBegin = "{\"attachmentInfos\": [";
		var attachmentStringEnd = "]}";
		var fullString = "";
		var indAttachmentInfos = "";
		
		fullString = attachmentStringBegin;
		
		var count = 0;

		if( err || !attachments.length) {
			console.log("No records were found.");
			return res.send("No records were found.");	
		}
		else {
			attachments.forEach( function(allAttachmentRecords) {
				
				count = count + 1;
								
				indAttachmentInfos = "\"id\": \"" + allAttachmentRecords.id + "\", " +
					"\"contentType\": \"" + allAttachmentRecords.contentType + "\", " +
					"\"size\": " + allAttachmentRecords.size + ", " +
					"\"name\": \"" + allAttachmentRecords.name + "\"";
				
				fullString = fullString + "{" + indAttachmentInfos + "}";
				
				if (count < attachments.length) {
					fullString = fullString + ", ";
				}
			})
				
			fullString = fullString + attachmentStringEnd;
		
			return res.send(fullString);
		};
	});

});

// This function will post an attachment for a particular ESRI record	
app.post('/api/v1/esriFeatures/:id/attachments', function(req, res){
	return console.log("SAGE ESRI Features (ID) Attachments POST REST Service Requested");

	
	AttachmentModel.find({}, function (err, attachments) {

		var newID;
		var maxID = 1;

		// Gets the Max OBJECTID from the Features Table
		attachments.forEach( function(allAttachments) {
			if (maxID <= allAttachments.id) {
				maxID = allAttachments.id + 1
			}
		});
		newID =  maxID;
		console.log(newID);

	var attachment;
	
	attachment = new AttachmentModel({
		id: newID,
		contentType: req.files.attachment.type,  
		size: req.files.attachment.size,  
		name: req.files.attachment.name,
		OBJECTID: req.params.id
	});
	
	
	attachment.save(function (err) {
		if (!err) {
			fs.readFile(req.files.attachment.path, function (err, data) {
				if (!err) {
					var newPath = __dirname + "/uploads/" + req.files.attachment.filename;
					
					fs.writeFile(newPath, data, function (err) {
							
						var body = '<html>'+
							'<head>'+
							'<meta http-equiv="Content-Type" content="text/html; '+
							'charset=UTF-8" />'+
							'<title>SAGE REST Services API Versions</title>'+
							'</head>'+
							'<body style="text-align:center">' +
							'<p><img src="/sage/uploads/' + req.params.id + "-" + req.files.attachment.filename + '"/></p>' +
							'<p>Attachment with ID: ' + attachment.id + ' created.' +
							'</body>' +
							'</html>';
						
						res.send(attachment);	
						//res.redirect("back");
					});
				} else {
					res.send(err);
				}
			});
			return console.log("Attachment with ID: " + attachment.id + " created.");
		} else {
			return console.log(err);
		}
	});
	
	return res.send(attachment);

	});
});

// Function to the the highest OBJECT ID in the Features table and increase it by one
app.get('/api/v1/getMax', function (req, res){
	return console.log("SAGE Get Max REST Service Requested");


	return FeatureModel.find({}, {'_id': 1, 'geometry': 1, 'attributes': 1}, function (err, features) {
		if (!err) {
			//return res.send(features);
			
			var newID;
			var maxID = 0;
						
			// Gets the Max OBJECTID from the Features Table
			features.forEach( function(allESRIRecords) {
				if (maxID < allESRIRecords.attributes.OBJECTID) {
					//return res.send(""+allESRIRecords.attributes.OBJECTID);
					maxID = allESRIRecords.attributes.OBJECTID + 1
				}
			});
			
			return res.send(""+maxID);
			
		} else {
			return res.send(err);
		};
	});
}); 

// Gets all the features with universal JSON formatting		
app.get('/api/v1/getIDs', function (req, res){
	return console.log("SAGE Get IDs GET REST Service Requested");

	return FeatureModel.find({}, {'_id': 0, 'attributes.OBJECTID': 1}, function (err, features) {
		

		var fullString = "{\"object_ids\": [";
		var object_ids = "";
		
		var count = 0;

		if( err || !features.length) {
			console.log("No records were found.");	
			return res.send("No records were found.");
		}
		else {
			
			features.forEach( function(allESRIRecords) {
				
				count = count + 1;
								
				object_ids = "{ \"OBJECTID\": " + allESRIRecords.attributes.OBJECTID + "}";
				
				fullString = fullString + object_ids;
				
				if (count < features.length) {
					fullString = fullString + ", ";
				}			
			})
				
			fullString = fullString + "]}";
		
			return res.send(fullString);
		};
	});
});

// Test for Epoch time		
app.get('/api/v1/epoch', function (req, res){
	return console.log("SAGE Epoch GET REST Service Requested");


	var myDate = "10/09/2012";
	
	var date = new Date("Sun Jan 15 2006 15:20:01"); // some mock date
	var milliseconds = date.getTime(); 

	return res.send(""+milliseconds);
	
});

// Launches the Node.js Express Server
app.listen(4242);