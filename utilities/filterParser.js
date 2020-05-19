const mongoose = require('mongoose');

function parse(filter) {
    var conditions = {};

    if (filter.in || filter.nin) {
        let json = {};
        if (filter.in) {
            json = JSON.parse(filter.in);
        } else {
            json = JSON.parse(filter.nin);
        }

        let userIds = json['userIds'] ? json['userIds'] : [];
        var objectIds = userIds.map(function (id) { return mongoose.Types.ObjectId(id); });

        if (filter.in) {
            conditions.userIds = {
                $in: objectIds
            };
        } else {
            conditions.userIds = {
                $nin: objectIds
            };
        }
    }

    if (filter.e) {
        conditions.teamEventId = null;
    }

    return conditions;
}

module.exports = {
    parse
}