var util = require('util');

function route(handle, pathname, response, request) {
	util.puts('About to route a request for ' + pathname);
	if (typeof handle[pathname] === 'function') {
		handle[pathname](response, request);
	} else {
		util.puts('No request handler found for ' + pathname);
		response.writeHead(404, {
			'Content-Type': 'text/html'
		});
		response.write('404 Not Found');
		response.end();
	}
}

exports.route = route;
