var util = require('util');
var fs = require('fs');
var child_process = require('child_process');




dev_server = {

	process: null,

	files: [],

	restarting: false,

	'restart': function() {
		this.restarting = true;
		util.debug('SAGE Node Server: Stopping server for restart.');
		this.process.kill();
		util.debug('SAGE Node Server: Server successfully restarted.');
	},

	'start': function() {
		var that = this;
		util.debug('SAGE Node Server: Starting server.');
		that.watchFiles();

		this.process = child_process.spawn(process.argv[0], ['sage.js']);

		this.process.stdout.addListener('data', function(data) {
			process.stdout.write(data);
		});

		this.process.stderr.addListener('data', function(data) {
			util.puts(data);
		});

		this.process.addListener('exit', function(code) {
			util.debug('SAGE Node Server: Child process exited: ' + code);
			this.process = null;
			if (that.restarting) {
				that.restarting = true;
				that.unwatchFiles();
				that.start();
			}
		});
	},

	'watchFiles': function() {
		var that = this;

		child_process.exec('find . | grep "\.js$"', function(error, stdout, stder) {
			var files = stdout.trim().split('\n');

			files.forEach(function(file) {
				that.files.push(file);
				fs.watchFile(file, {interval : 500}, function(curr, prev) {
				if (curr.mtime.valueOf != prev.mtime.valueOf() || curr.ctime.valueOf() != prev.ctime.valueOf()) {
					util.debug('SAGE Node Server: Restarting because of changed file at ' + file);
					dev_server.restart();
				}
				});
			});
		});
	},

	'unwatchFiles': function() {
		this.files.forEach(function(file) {
			fs.unwatchFile(file);
		});
		this.files = [];
	}
}

dev_server.start();
