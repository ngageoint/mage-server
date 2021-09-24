"use strict";

exports.id = 'create-blacklist-settings';

exports.up = function (done) {
    const update = {
        $set: {
            'settings': {
                'clientID': '',
                'clientSecret': '',
                'client_id': '',
                'bindCredentials': ''
            }
        }
    };

    this.db.collection('settings').findAndModify({ type: 'blacklist' }, null, update, { upsert: true }, done);
};

exports.done = function (done) {
    done();
};