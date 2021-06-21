"use strict";

class JSONProvider {

    read(data) {
        return JSON.parse(data);
    }

    write(data) {
        return JSON.stringify(data);
    }
}

module.exports = JSONProvider;