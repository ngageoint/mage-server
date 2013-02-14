var util = require('util');
var http = require('http');
var url = require('url');

function start(route, handle) {

	function onRequest(request, response) {
	/*	var postData = "";*/
		var pathname = url.parse(request.url).pathname;
		util.puts('Request for ' + pathname + ' received.');
		
		/*
		request.addListener('data', function(postDataChunk) {
			postData += postDataChunk;
			util.puts('Received POST data chunk "' + postDataChunk + '".');
		});

		request.addListener('end', function() {
			route(handle, pathname, response, request, postData);
		});
		*/
		route(handle, pathname, response, request);	
		
	}

	http.createServer(onRequest).listen(8888);
	
	util.puts('Server has started.');

}

exports.start = start;
