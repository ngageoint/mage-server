"use strict";

const FileSystemSecretStore = require("./local/file-system-secret-store")
    , log = require('winston')
    , ReadCommand = require('./local/read-command')
    , WriteCommand = require('./local/write-command');


class SecretStoreService {
  
    constructor(config = {}) {
        this._config = config;
        this._backingDataStore = new FileSystemSecretStore();
    }

    read(dataId, options = {}) {

        const command = new ReadCommand(dataId);

        return this._backingDataStore.send(command);
    }

    write(dataId, data, options = {}) {

        const command = new WriteCommand(dataId);

        return this._backingDataStore.send(command);
    }
}

module.exports = SecretStoreService;