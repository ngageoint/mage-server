"use strict";

class ReadCommand {
    _id;

    constructor(id) {
        this._id = id;
    }

    get id() {
        return this._id;
    }
}

module.exports = ReadCommand;