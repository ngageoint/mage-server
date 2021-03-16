const log = require('winston');

exports.id = 'move-local-auth-from-settings';

exports.up = function (done) {
    log.info('Moving local authentication from settings to authenticationconfigurations');

    const settings = this.db.collection('settings');
    settings.findOneAndDelete({ type: 'security' }).then(result => {
        const authDbObject = {
            local: result.value.settings.local
        };
        this.db.collection('authenticationconfigurations').insertOne(authDbObject, {}, done);
    }).catch(err => {
        done(err);
    });
};

exports.down = function (done) {
    done();
};