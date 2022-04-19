"use strict";

const log = require('winston')
    , SecretStoreService = require('../security/secret-store-service');

exports.id = 'move-security-settings-to-secret-store';

function moveSecuritySettings(settings, blacklist) {
    const data = {};
    Object.keys(settings).forEach(key => {
        if (blacklist.includes(key.toLowerCase())) {
            data[key] = settings[key];
            delete settings[key];
        }
    });
    return data;
}

exports.up = async function (done) {
    const blacklist = ['clientid', 'clientsecret', 'client_id', 'bindcredentials'];

    const authenticationConfigurationsCollection = await this.db.collection('authenticationconfigurations');
    const cursor = authenticationConfigurationsCollection.find();

    let hasNext = true;
    while (hasNext === true) {
        hasNext = await cursor.hasNext()
        if (hasNext !== true) break;

        const authConfig = await cursor.next();

        if (authConfig.settings) {
            const data = moveSecuritySettings(authConfig.settings, blacklist);

            if (Object.keys(data).length > 0) {
                log.info('Moving security settings for auth config ' + authConfig.name);

                const store = new SecretStoreService();
                try {
                    await store.write(authConfig._id.toString(), data);
                    await authenticationConfigurationsCollection.updateOne({ _id: authConfig._id }, authConfig);
                } catch (err) {
                    log.warn(err);
                    return done(err);
                }
            }
        } else {
            log.info('No settings found for ' + authConfig.name);
        }
    }

    done();
};

exports.down = function (done) {
    done();
}