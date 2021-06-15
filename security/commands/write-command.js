"use strict";

class WriteCommand {
    _id;
    _data;
    
    constructor(id, data) {
        this._id = id;
        this._data = data;
    }

    get id() {
        return this._id;
    }

    get data() {
        return this._data;
    }
}

module.exports = WriteCommand;