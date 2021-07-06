'use strict';

const log = require('winston');

exports.id = 'link-auth-to-auth-config';

async function link(authenticationCollection, authenticationConfigurationsCollection) {
    const cursor = authenticationCollection.find();

    let hasNext = true;
    while (hasNext === true) {
        hasNext = await cursor.hasNext()
        if (hasNext !== true) break;

        const authentication = await cursor.next();

        //Name was "unique" prior to this server version, so key off of that.  This uniqueness does not maintain after this version however.
        const authenticationConfiguration = await authenticationConfigurationsCollection.findOne({ name: authentication.type });
        if (authenticationConfiguration) {
            authentication.authenticationConfigurationId = authenticationConfiguration._id;

            log.info('Linking authentication ' + authentication._id + ' to authentication configuration ' + authenticationConfiguration._id);
            await authenticationCollection.updateOne({ _id: authentication._id }, authentication);
        } else {
            log.info('Authentication strategy is not configured for ' + authentication._id);
        }
    }

    // Close the cursor, this is the same as reseting the query
    cursor.close(function (err) {
        if (err) log.warn("Failed closing authentications cursor", err);
    });
}

exports.up = function (done) {
    log.info('Linking authentications to their authentication configuration');

    this.db.collection('authentications', { strict: true }, (err, authenticationCollection) => {
        if (err) return done(err);

        this.db.collection('authenticationconfigurations', { strict: true }, (err, authenticationConfigurationsCollection) => {
            if (err) return done(err);

            link(authenticationCollection, authenticationConfigurationsCollection).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
    });
};

exports.down = function (done) {
    done();
};