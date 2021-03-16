const log = require('winston');

exports.id = 'move-local-auth-from-settings';

exports.up = function (done) {
    log.info('Moving local authentication from settings to authenticationconfigurations');

    const settings = this.db.collection('settings');
    settings.findOneAndDelete({ type: 'security' }).then(result => {
        const authDbObject = {
            name: 'local',
            type: 'local'
        };
        const authStratConfigKeys = Object.keys(result.value.settings.local);
        for (let i = 0; i < authStratConfigKeys.length; i++) {
            const key = authStratConfigKeys[i];
            authDbObject[key] = result.value.settings.local[key];
        }
        log.debug('Strategy ' + 'local' + ' DB object:' + JSON.stringify(authDbObject));
        this.db.collection('authenticationconfigurations').insertOne(authDbObject, {}, done);
    }).catch(err => {
        done(err);
    });
};

exports.down = function (done) {
    done();
};