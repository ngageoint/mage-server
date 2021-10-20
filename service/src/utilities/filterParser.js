const mongoose = require('mongoose');

function parse(filter) {
    var conditions = {};

    if (filter.in) {
        handleIn(filter, conditions);
    }
    if (filter.nin) {
        handleNin(filter, conditions);
    }
    if (filter.e) {
        handleEquals(filter, conditions);
    }
    if (filter.or) {
        handleOr(filter, conditions);
    }

    return conditions;
}

function handleIn(filter, conditions) {
    let objectIds = toObjectIds(filter.in);
    for (const [key, value] of objectIds) {
        conditions[key] = {
            $in: value
        }
    }
}

function handleNin(filter, conditions) {
    let objectIds = toObjectIds(filter.nin);
    for (const [key, value] of objectIds) {
        conditions[key] = {
            $nin: value
        }
    }
}

function handleEquals(filter, conditions) {
    var json = filter.e;

    try {
        json = JSON.parse(filter.e);
    } catch (e) {

    }

    Object.keys(json).forEach(function (key) {
        var value = json[key];
        conditions[key] = value;
    });
}

function handleOr(filter, conditions) {
    var json = filter.or;

    try {
        json = JSON.parse(filter.or);
    } catch (e) {

    }

    var orCondition = [];
    for (let [key, value] of Object.entries(json)) {
        let entry = {};
        let regex = { "$regex": new RegExp(value), "$options": "i" };
        entry[key] = regex;
        orCondition.push(entry);
    }
    conditions['$or'] = orCondition;
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