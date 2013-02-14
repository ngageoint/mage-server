var util = require('util');
var server = require('./server');
var router = require('./router');
var requestHandlers = require('./requestHandlers');

util.puts('Setting up handler');

var handle = {};
handle['/'] = requestHandlers.start;
handle['/start'] = requestHandlers.start;
handle['/upload'] = requestHandlers.upload;
handle['/show'] = requestHandlers.show;
handle['/getESRIStyleRecords'] = requestHandlers.getESRIStyleRecords;

server.start(router.route, handle);
