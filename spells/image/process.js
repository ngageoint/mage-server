var config = require('./config.json')
	, serverConfig = require('../../config.json')
	, async = require('async')
	, path = require('path')
	, fs = require('fs-extra')
	, mongoose = require('mongoose')
	, Layer = require('../../models/layer')
	, Feature = require('../../models/feature')
	, gm = require('gm');

console.log('starting image processing');

var attachmentBase = serverConfig.server.attachment.baseDirectory;
var thumbSizes = config.image.thumbSizes;

var timeout = 5 * 60 * 1000; // todo read this from config

var mongodbConfig = config.mongodb;
mongoose.connect(mongodbConfig.url, {server: {poolSize: mongodbConfig.poolSize}}, function(err) {
	if (err) {
		console.log('Error connecting to mongo database, please make sure mongodbConfig is running...');
		throw err;
	}
});
mongoose.set('debug', true);

function processLayer(layer, callback) {
	async.eachSeries(layer.features, function(feature, done) {
		processAttachment(layer.layer, feature._id, feature.attachment, done);
	},
	function(err) {
		callback(err);
	});
}

function processAttachment(layer, featureId, attachment, callback) {
	if (attachment.oriented) {
		thumbnail(layer, featureId, attachment, callback);
	} else {
		orient(layer, featureId, attachment, callback);
	}
}

function orient(layer, featureId, attachment, callback) {
	console.log('orient attachment');

	var file = path.join(attachmentBase, attachment.relativePath);
	var outputFile =  file + "_orient";
	console.log("file", file);

	gm(file).autoOrient().write(outputFile, function(err) {
		console.log("orientation of attachment " + attachment.name + " complete");
		fs.rename(outputFile, file, function(err) {
			if (err) return callback(err);

			gm(file).size(function(err, size) {
				var stat = fs.statSync(file);
				attachment.size = stat.size;
				attachment.width = size.width;
				attachment.height = size.height;
				attachment.oriented = true;
				Feature.updateAttachment(layer, featureId, attachment._id, attachment, function(err, feature) {
					callback();
				});
			});
		});
	});
}

function thumbnail(layer, featureId, attachment, callback) {
	var file = path.join(attachmentBase, attachment.relativePath);

	async.eachSeries(thumbSizes, function(thumbSize, done) {
		var containsThumbnail = attachment.thumbnails.some(function(thumbnail) {
			return thumbnail.minDimension == thumbSize;
		});
		if (containsThumbnail) return done();

		var thumbPath = path.join(path.dirname(file), path.basename(file, path.extname(file))) + "_" + thumbSize + path.extname(file);    

		var thumbWidth = attachment.width <= attachment.height ? thumbSize : null;
		var thumbHeight = attachment.height < attachment.width ? thumbSize : null;

		if (!thumbWidth) thumbWidth = Math.ceil((thumbHeight / attachment.height) * attachment.width);
		if (!thumbHeight) thumbHeight = Math.ceil((thumbWidth / attachment.width) * attachment.height);

		if (thumbWidth > attachment.width || thumbHeight > attachment.height) return done();

		console.log('thumbnailing attachment ' + attachment.name + ' for size ' + thumbSize);

		gm(file)
			.in("-size").in(thumbWidth * 2 + "x" + thumbHeight * 2)
			.resize(thumbWidth, thumbHeight)
			.write(thumbPath, function(err) {
				if (err) {
					console.log('Error thumbnailing file to size: ' + thumbSize, err);
					callback(err);
					return;
				} else {
					// write to mongo
					console.log('Finished thumbnailing ' + thumbSize);

					var stat = fs.statSync(thumbPath);

					Feature.addAttachmentThumbnail(layer, featureId, attachment._id, { 
						size: stat.size,
						name: path.basename(attachment.name, path.extname(attachment.name)) + "_" + thumbSize + path.extname(attachment.name),
						relativePath: path.join(path.dirname(attachment.relativePath), path.basename(attachment.relativePath, path.extname(attachment.relativePath))) + "_" + thumbSize + path.extname(attachment.relativePath),
						contentType: attachment.contentType,
						minDimension: thumbSize,
						height: thumbHeight,
						width: thumbWidth
					},
					function(err) {
						if (err) console.log('error writing thumb to db', err);

						console.log('thumbnailing wrote thumb metadata to db');

						done(err);
					});
				}
			});
		}, function(err) {
			if (err) {
				console.log('error thumbnailing', err);
			} else {
				console.log('Finished thumbnailing ' + attachment.name);
			}
			callback(err);
	});
}

var processAttachments = function() {
	async.waterfall([
		function(done) {
			//get feature layers      
			Layer.getLayers({type: 'Feature'}, function(err, layers) {
				done(err, layers);
			});
		},
		function(layers, done) {
			// aggregate results into array of attachments that have not been oriented, and orient
			var results = [];
			async.eachSeries(layers, function(layer, done) {
				var match = {
					"$match": { "attachments.contentType": { "$regex": /^image/ }, "attachments.oriented": false }
				};
				var sort = {"$sort": { "lastModified": 1 }};
				var unwind = {"$unwind": "$attachments"};
				var project = {"$project": {attachment: "$attachments"}};
				Feature.featureModel(layer).aggregate(match, sort, unwind, match, project, function(err, aggregate) {
					results.push({layer: layer, features: aggregate});
					done(err);
				});
			},
			function(err) {
				done(err, layers, results);
			});
		},
		function(layers, results, done) {
			async.eachSeries(results, function(result, done) {
				processLayer(result, done);
			},
			function(err) {
				done(err, layers);
			});
		},
		function(layers, done) {
			// aggregate results into array of attachments that have been oriented
			// but do no have all the nessecary thumbnails
			var results = [];
			async.eachSeries(layers, function(layer, done) {
				var match = {
					"$match": { 
						"attachments.contentType": { "$regex": /^image/ }, 
						"attachments.oriented": true, 
						"attachments.thumbnails.size": { "$not": { "$all": thumbSizes } } 
					}
				};
				var sort = {"$sort": { "lastModified": 1 }};
				var unwind = {"$unwind": "$attachments"};
				var project = {"$project": {attachment: "$attachments"}};
				Feature.featureModel(layer).aggregate(match, sort, unwind, match, project, function(err, aggregate) {
					results.push({layer: layer, features: aggregate});
					done(err);
				});
			},
			function(err) {
				done(err, layers, results);
			});
		},
		function(layers, results, done) {
			async.eachSeries(results, function(result, done) {
				processLayer(result, done);
			},
			function(err) {
				done(err, layers);
			});
		}
	],
	function(err, result) {
		if (err) console.log('error orienting images', err);

		console.log('done processing attachments');
		setTimeout(processAttachments, timeout);
	});
};

processAttachments();
