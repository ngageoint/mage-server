const mongoose = require('mongoose');

function parse(filter) {
    var conditions = {};

    if (filter.in) {
        var objectIds = toObjectIds(filter.in);
        conditions.userIds = {
            $in: objectIds
        }
    }
    if (filter.nin) {
        var objectIds = toObjectIds(filter.nin);
        conditions.userIds = {
            $nin: objectIds
        };
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

    var objectIds = [];
    Object.keys(json).forEach(function (key) {
        var value = json[key];
        if (Array.isArray(value)) {
            objectIds = value.map(function (id) { return mongoose.Types.ObjectId(id); });
        } else {
            objectIds = [mongoose.Types.ObjectId(value)];
        }
    });

    return objectIds;
}

module.exports = {
    parse
}