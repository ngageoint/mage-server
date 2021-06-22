"use strict";

class JSONProvider {

    read(data) {
        let parsedData = data;

        try {
            parsedData = JSON.parse(data);
        } catch (err) {

        }

        return parsedData;
    }

    write(data) {
        return JSON.stringify(data);
    }
}

module.exports = JSONProvider;