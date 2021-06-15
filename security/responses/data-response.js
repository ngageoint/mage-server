"use strict";

class DataResponse {
    _id;
    _error = null;
    _status = true;
    _data = null;

    constructor(id) {
        this._id = id;
    }

    get id() {
        return this._id;
    }

    get error() {
        return this._error;
    }

    set error(error) {
        this._error = error;
    }

    get status() {
        return this._status;
    }

    set status(status) {
        this._status = status;
    }

    get data() {
        return this._data;
    }

    set data(data) {
        this._data = data;
    }
}

module.exports = DataResponse;