var config = require('./config.json')
	, serverConfig = require('../../config.json')
	, async = require('async')
	, path = require('path')
	, fs = require('fs-extra')
	, mongoose = require('mongoose')
	, Layer = require('../../models/layer')
	, Feature = require('../../models/feature')
	, gm = require('gm');

var attachmentBase = serverConfig.server.attachment.baseDirectory;
var thumbSizes = config.image.thumbSizes;

var timeout = config.image.interval * 1000;

var featureTimes = {};
var lastFeatureTimes = {orient: {}, thumbnail: {}};

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
	console.log('orient attachment ' + attachment.name);

	var file = path.join(attachmentBase, attachment.relativePath);
	var outputFile =  file + "_orient";
	console.log("file", file);

	var start = new Date().valueOf();
	gm(file).autoOrient().write(outputFile, function(err) {
		var end = new Date().valueOf();
		console.log("orientation of attachment " + attachment.name + " complete in " + (end - start)/1000 + " seconds");
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
		var start = new Date().valueOf();
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
					var end = new Date().valueOf();
					console.log('Finished thumbnailing ' + thumbSize + " in " + (end - start)/1000 + " seconds");

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
	console.log('processing attachments, starting from', lastFeatureTimes);

	async.waterfall([
		function(done) {
			//get feature layers      
			Layer.getLayers({type: 'Feature'}, function(err, layers) {
				async.each(layers, function(layer, done) {
					Feature.featureModel(layer).findOne({}, {lastModified: true}, {sort: {"lastModified": -1}, limit: 1}, function(err, feature) {
						if (feature) featureTimes[layer.collectionName] = feature.lastModified;
						done();
					});
				},
				function(err) {
					done(err, layers);
				});
			});
		},
		function(layers, done) {
			// aggregate results into array of attachments that have not been oriented, and orient
			var results = [];
			async.eachSeries(layers, function(layer, done) {
				var match = {
					"attachments.contentType": { "$regex": /^image/ }, 
					"attachments.oriented": false
				};

				var lastTime = lastFeatureTimes.orient[layer.collectionName];
        if (lastTime) {
          match.lastModified = {"$gt": lastTime};
        }

				var sort = {"$sort": { "lastModified": 1 }};
				var unwind = {"$unwind": "$attachments"};
				var project = {"$project": {lastModified: 1, attachment: "$attachments"}};
				Feature.featureModel(layer).aggregate({"$match": match}, sort, unwind, {"$match": match}, project, function(err, aggregate) {
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
				processLayer(result, function(err) {
					// Update time
					lastFeatureTimes.orient[result.layer.collectionName] = featureTimes[result.layer.collectionName];
					done();
				});
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
				var match =  { 
					"attachments.contentType": { "$regex": /^image/ }, 
					"attachments.oriented": true, 
					"attachments.thumbnails.minDimension": { "$not": { "$all": thumbSizes } } 
				};

				var lastTime = lastFeatureTimes.thumbnail[layer.collectionName];
        if (lastTime) {
          match.lastModified = {"$gt": lastTime};
        }

				var sort = {"$sort": { "lastModified": 1 }};
				var unwind = {"$unwind": "$attachments"};
				var project = {"$project": {lastModified: 1, attachment: "$attachments"}};
				Feature.featureModel(layer).aggregate({"$match": match}, sort, unwind, {"$match": match}, project, function(err, aggregate) {
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
				processLayer(result, function(err) {
					// Update time
					lastFeatureTimes.thumbnail[result.layer.collectionName] = featureTimes[result.layer.collectionName];
					done();
				});
			},
			function(err) {
				done(err, layers);
			});
		}
	],
	function(err, result) {
		if (err) console.log('error processing images', err);

		console.log('done processing attachments');

		setTimeout(processAttachments, timeout);
	});
};

processAttachments();