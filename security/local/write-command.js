"use strict";

class WriteCommand {
    _id;

    constructor(id) {
        this._id = id;
    }

    get id() {
        return this._id;
    }
}

module.exports = WriteCommand;