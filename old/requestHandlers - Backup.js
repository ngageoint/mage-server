var util = require('util');
var queryString = require('querystring');
var fs = require('fs');
var url = require('url');
var formidable = require('formidable');

// MongoJS SAGE Database Objects
var databaseUrl = "sagedb";
var collections = ["features", "observation_types", "esri_headers", "esri_fields"]
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;

var esriHeaders = "\"objectIdFieldName\": \"OBJECTID\", \"globalIdFieldName\": \"\", \"geometryType\": \"esriGeometryPoint\", \"spatialReference\": {\"wkid\": 4326}";
var esriFields = "[{\"name\":\"OBJECTID\",\"alias\":\"OBJECTID\",\"type\": \"esriFieldTypeOID\"  },  {\"name\": \"ADDRESS\",   \"alias\": \"ADDRESS\",   \"type\": \"esriFieldTypeString\",   \"length\": 255  },  {   \"name\": \"EVENTDATE\",   \"alias\": \"EVENTDATE\",   \"type\": \"esriFieldTypeDate\",   \"length\": 36  },  {   \"name\": \"TYPE\",   \"alias\": \"TYPE\",   \"type\": \"esriFieldTypeString\",   \"length\": 50  },  {   \"name\": \"EVENTLEVEL\",   \"alias\": \"LEVEL\",   \"type\": \"esriFieldTypeString\",   \"length\": 50  },  {   \"name\": \"TEAM\",   \"alias\": \"TEAM\",   \"type\": \"esriFieldTypeString\",   \"length\": 50  },  {   \"name\": \"DESCRIPTION\",   \"alias\": \"DESCRIPTION\",   \"type\": \"esriFieldTypeString\",   \"length\": 1073741822  },  {   \"name\": \"USNG\",   \"alias\": \"USNG\",   \"type\": \"esriFieldTypeString\",   \"length\": 255  },  {   \"name\": \"EVENTCLEAR\",   \"alias\": \"EVENTCLEAR\",   \"type\": \"esriFieldTypeDate\",   \"length\": 36  },  {   \"name\": \"UNIT\",   \"alias\": \"UNIT\",   \"type\": \"esriFieldTypeString\",   \"length\": 100  } ]";

// MongoJS SAGE Database Connection 
var db = require("mongojs").connect(databaseUrl, collections);

////////////// Mongoose SAGE Database Connection //////////////
//var mongoose = require('mongoose'), db = mongoose.createConnection('localhost', 'test');
//
//db.on('error', console.error.bind(console, 'connection error:'));
//db.once('open', function () {
//	console.log("The Mongoose Connecter is open and working.");
//});

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

function start(response) {
	util.puts('Request handler "start" was called.');	

	var body = '<html>'+
		'<head>'+
		'<meta http-equiv="Content-Type" content="text/html; '+
		'charset=UTF-8" />'+
		'</head>'+
		'<body>'+
		'<form action="/upload" enctype="multipart/form-data" method="post">'+
		'<textarea name="text" rows="20" cols="60"></textarea>' +
		'<br>' +
		'<input type="file" name="upload">' +
		'<input type="submit" value="Upload Data" />'+
		'</form>'+
		'</body>'+
		'</html>';	

	response.writeHead(200, {
		'Content-Type': 'text/html'
		});
		response.write(body);
		response.end();
}

function upload(response, request) {
	util.puts('Request handler "upload" was called.');

	var form = new formidable.IncomingForm();
	util.puts('about to parse');
	form.parse(request, function(error, fields, files) {
		util.puts('parsing done');

		/* Possible error on Windows systems
		   tried to rename to an already existing file. */
		fs.rename(files.upload.path, '/tmp/test.png', function(err) {
			if (err) {
				fs.unlink('/tmp/test.png');
				fs.rename(files.upload.path, '/tmp/test.png');
			}
		});
		response.writeHead(200, {
			'Content-Type': 'text/html'
		});
		response.write('You\'ve sent the text: ' + 
			queryString.parse(response).text);
		response.write('received image:<br/>');
		response.write('<img src=\'/show\' />');
		response.end();
	});
}

function show(response) {
	util.puts('Request Handler "show" was called.');
	fs.readFile('/tmp/test.png', 'binary', function(error, file) {
		if(error) {
			response.writeHead(500, {
				'Content-Type': 'text/plain'
			});
			response.write(err + '\n');
			response.end();
		} else {
			response.writeHead(200, {
				'Content-Type': 'image/png'
			});
			response.write(file, 'binary');
			response.end();
		}
	});
}


//				response.writeHead(200, {'Content-Type': 'application/json'});
//				
////				response.writeHead(200, {
////					'Content-Type': 'text/javascript; charset=utf8',
////					'Access-Control-Max-Age': '3628800',
////					'Access-Control-Allow-Origin' : '*',
////					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
////				});
//								
//				response.write("" + allRecords);
//				
////response.write(", \"features\": " + allRecords+"}");
//				response.end();

function getESRIStyleRecords(response, request) {
	
	util.puts('Request handler "getESRIStyleRecords" was called.');
	
	// extract the GET data
	var queryParams = new QueryData(url.parse(request.url).query);
	
	////////////// WORKS FOR GETTING ALL RECORDS /////////////////	
	if(queryParams.defined === "false") {

		db.features.find({}, {'_id': 0, 'geometry': 1, 'attributes': 1}, function(err, queryResults) {
	
			if( err || !queryResults.length) {
				console.log("No records were found.");
				
				response.writeHead(200, {'Content-Type': 'text/html'});
				response.write("No records were found.");
				response.end();		
			}
			else {queryResults.forEach( function(test_function) {
				
				var allRecords = JSON.stringify(queryResults);
				//console.log(allRecords);

				response.writeHead(200, {
					'Content-Type': 'text/plain;charset=utf-8',
					'Access-Control-Max-Age': '3628800',
					'Access-Control-Allow-Origin' : '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
				});
				
				response.write("{" + esriHeaders + ", \"fields\": " + esriFields + ", \"features\": " + allRecords+"}"); 
				response.end();		
			});
	
		}});
		
	}
	
	///////////////// GET SINGLE RECORD BY OBJECT ID ///////////////////////
	if (typeof queryParams.id != "undefined" ) {
		
		///////////////// GET SINGLE RECORD BY OBJECT ID ///////////////////////		
		
		db.features.find({ _id: ObjectId(queryParams.id)}, function(err, queryResults) {
	
			if( err || !queryResults.length) {
				console.log("MongoDB ID ' " + queryParams.id + "' not found.");
				
				response.writeHead(200, {'Content-Type': 'text/html'});
				response.write("MongoDB ID ' " + queryParams.id + "' not found.");
				response.end();		
			}
			else {queryResults.forEach( function(test_function) {
				
				var allRecords = JSON.stringify(queryResults);
				//console.log(allRecords);

				response.writeHead(200, {
					'Content-Type': 'text/plain;charset=utf-8',
					'Access-Control-Max-Age': '3628800',
					'Access-Control-Allow-Origin' : '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
				});
				
				response.write("{" + esriHeaders + ", \"fields\": " + esriFields + ", \"features\": " + allRecords+"}"); 
				response.end();		
			});
		}});	
	}
	
	/////////////////  GET RECORDS BY EVENT LEVEL ///////////////////////
	if (typeof queryParams.eventlevel != "undefined" ) {		
		
		db.features.find({"attributes.eventlevel": queryParams.eventlevel}, function(err, queryResults) {
	
			if( err || !queryResults.length) {
				console.log("No records with the event level ' " + queryParams.eventlevel + "' found.");
				
				response.writeHead(200, {'Content-Type': 'text/html'});
				response.write("No records with the event level '" + queryParams.eventlevel + "' found.");
				response.end();		
			}
			else {queryResults.forEach( function(test_function) {
				
				var allRecords = JSON.stringify(queryResults);
				//console.log(allRecords);

				response.writeHead(200, {
					'Content-Type': 'text/plain;charset=utf-8',
					'Access-Control-Max-Age': '3628800',
					'Access-Control-Allow-Origin' : '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
				});
				
				response.write("{" + esriHeaders + ", \"fields\": " + esriFields + ", \"features\": " + allRecords+"}"); 
				response.end();	
			});
		}});	
	}
}

exports.start = start;
exports.upload = upload;
exports.show = show;
exports.getESRIStyleRecords = getESRIStyleRecords;