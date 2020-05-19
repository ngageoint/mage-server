const mongoose = require('mongoose');

function parse(filter) {
    var conditions = {};

    if (filter.in) {
        let objectIds = toObjectIds(filter.in);
        for(const [key, value] of objectIds) {
            conditions[key] = {
                $in: value
            }
        }
    }
    if (filter.nin) {
        let objectIds = toObjectIds(filter.nin);
        for(const [key, value] of objectIds){
            conditions[key] = {
                $nin: value
            }
        }
    }
    if (filter.e) {
        conditions.teamEventId = null;
    }

    return conditions;
}

function toObjectIds(operation) {
    var json = operation;

    try {
        json = JSON.parse(operation);
    } catch (e) {

    }

    const objectIds = new Map();

    Object.keys(json).forEach(function (key) {
        var value = json[key];

        let ids = [];
        if (Array.isArray(value)) {
            ids = value.map(function (id) { return mongoose.Types.ObjectId(id); });
        } else {
            ids = [mongoose.Types.ObjectId(value)];
        }

        objectIds.set(key, ids);
    });

    return objectIds;
}

module.exports = {
    parse
}