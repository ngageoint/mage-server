/*
* This file is part of the Spludo Framework.
* Copyright (c) 2009-2010 DracoBlue, http://dracoblue.net/
*
* Licensed under the terms of MIT License. For the full copyright and license
* information, please see the LICENSE file in the root folder.
*/

var child_process = require('child_process');
var fs = require("fs");
var util = require("util");

dev_server = {

    process: null,

    files: [],

    restarting: false,

    "restart": function() {
        this.restarting = true;
        util.debug('DEVSERVER: Stopping server for restart');
        this.process.kill();
    },

    "start": function() {
        var that = this;
        util.debug('DEVSERVER: Starting server');
        that.watchFiles();

		/* This line sets the actual Node server file to be used. */
        this.process = child_process.spawn(process.argv[0], ['server.js']); 

        this.process.stdout.addListener('data', function (data) {
            process.stdout.write(data);
        });

        this.process.stderr.addListener('data', function (data) {
            util.print(data);
        });

        this.process.addListener('exit', function (code) {
            util.debug('DEVSERVER: Child process exited: ' + code);
            this.process = null;
            if (that.restarting) {
                that.restarting = true;
                that.unwatchFiles();
                that.start();
            }
        });

    },

    "watchFiles": function() {
        var that = this;

        child_process.exec('find . | grep "\.js$"', function(error, stdout, stderr) {
            var files = stdout.trim().split("\n");

            files.forEach(function(file) {
                that.files.push(file);
                fs.watchFile(file, {interval : 500}, function(curr, prev) {
                    if (curr.mtime.valueOf() != prev.mtime.valueOf() || curr.ctime.valueOf() != prev.ctime.valueOf()) {
                        util.debug('DEVSERVER: Restarting because of changed file at ' + file);
                        dev_server.restart();
                    }
                });
            });
        });
   },

    "unwatchFiles": function() {
        this.files.forEach(function(file) {
            fs.unwatchFile(file);
        });
        this.files = [];
    }
}


dev_server.start();