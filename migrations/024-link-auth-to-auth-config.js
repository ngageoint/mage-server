'use strict';

const log = require('winston');

exports.id = 'link-auth-to-auth-config';

exports.up = function (done) {
    log.info('Linking authentications to their authentication configuration');

    const self = this;
    this.db.collection('authentications', { strict: true }, function (err, authenticationCollection) {
        if (err) return done(err);

        self.db.collection('authenticationconfigurations', { strict: true }, function (err, authenticationConfigurationsCollection) {
            if (err) return done(err);

            link(authenticationCollection, authenticationConfigurationsCollection).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
    });
};

async function link(authenticationCollection, authenticationConfigurationsCollection) {
    const cursor = authenticationCollection.find();

    let hasNext = true;
    while (hasNext === true) {
        hasNext = await cursor.hasNext()
        if (hasNext !== true) break;

        const authentication = await cursor.next();

        if (authentication.hasOwnProperty('authenticationConfigurationId')) {
            const authenticationConfiguration = await authenticationConfigurationsCollection.findOne({ type: authentication.type });
            authentication.authenticationConfigurationId = authenticationConfiguration._id;

            log.info('Linking authentication ' + authentication._id + ' to authentication configuration ' + authenticationConfiguration._id);
            await authenticationCollection.updateOne({ _id: authentication._id }, authentication);
        }
    }

    // Close the cursor, this is the same as reseting the query
    cursor.close(function (err) {
        if (err) log.warn("Failed closing authentications cursor", err);
    });
}

exports.down = function (done) {
    done();
};