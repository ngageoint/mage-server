"use strict";

const env = require('../../environment/env')
    , log = require('winston')
    , ReadCommand = require('./read-command')
    , WriteCommand = require('./write-command');

class FileSystemSecretStore {
    constructor() {

    }
    
    send(command) {

        if (command instanceof ReadCommand) {

        } else if (command instanceof WriteCommand) {

        }
    }
}


module.exports = FileSystemSecretStore;