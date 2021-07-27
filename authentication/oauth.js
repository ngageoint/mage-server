'use strict';

const TokenAssertion = require('./verification').TokenAssertion
    , api = require('../api')
    , log = require('../logger')
    , UserTransformer = require('../transformers/user')
    , AuthenticationInitializer = require('./index')
    , AuthenticationApiAppender = require('../utilities/authenticationApiAppender');

function doConfigure(config) {
    log.info('Configuring ' + config.title + ' authentication');

    //TODO configure generic oauth strategy
}

function initialize(config) {
    const app = AuthenticationInitializer.app;
    const passport = AuthenticationInitializer.passport;
    const provision = AuthenticationInitializer.provision;
    const tokenService = AuthenticationInitializer.tokenService;

    switch (config.name) {
        case 'login-gov':
            //TODO test login.gov
            const loginGov = require('../authentication/' + config.name);
            loginGov.initialize(config);
            return;
        case 'google':
        case 'geoaxis':
            const specificOauth = require('../authentication/' + config.name);
            specificOauth.initialize(config);
            break;
        default:
            doConfigure(config);
            break;
    }

    function parseLoginMetadata(req, res, next) {
        const options = {};
        options.userAgent = req.headers['user-agent'];
        options.appVersion = req.param('appVersion');

        req.loginOptions = options;
        next();
    }

    function authenticate(req, res, next) {
        passport.authenticate(config.name, function (err, user, info = {}) {
            if (err) return next(err);

            req.user = user;

            // For inactive or disabled accounts don't generate an authorization token
            if (!user.active || !user.enabled) {
                log.warn('Failed user login attempt: User ' + user.username + ' account is inactive or disabled.');
                return next();
            }

            if (!user.authentication.authenticationConfigurationId) {
                log.warn('Failed user login attempt: ' + user.authentication.type + ' is not configured');
                return next();
            }

            if (!user.authentication.authenticationConfiguration.enabled) {
                log.warn('Failed user login attempt: Authentication ' + user.authentication.authenticationConfiguration.title + ' is disabled.');
                return next();
            }

            // DEPRECATED session authorization, remove req.login which creates session in next version
            req.login(user, function (err) {
                tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5)
                    .then(token => {
                        req.token = token;
                        req.user = user;
                        req.info = info;
                        next();
                    }).catch(err => {
                        next(err);
                    });
            });
        })(req, res, next);
    }

    app.get(
        '/auth/' + config.name + '/signin',
        function (req, res, next) {
            passport.authenticate(config.name, {
                scope: config.scope,
                state: req.query.state
            })(req, res, next);
        }
    );

    // DEPRECATED session authorization, remove in next version.
    app.post(
        '/auth/' + config.name + '/authorize',
        function (req, res, next) {
            if (req.user) {
                log.warn('session authorization is deprecated, please use jwt');
                return next();
            }

            passport.authenticate('authorization', function (err, user, info = {}) {
                if (!user) return res.status(401).send(info.message);

                req.user = user;
                next();
            })(req, res, next);
        },
        provision.check(config.name),
        parseLoginMetadata,
        function (req, res, next) {
            new api.User().login(req.user, req.provisionedDevice, req.loginOptions, function (err, token) {
                if (err) return next(err);

                AuthenticationApiAppender.append(config.api).then(apiCopy => {
                    const api = Object.assign({}, apiCopy);
                    api.authenticationStrategies[config.name] = {
                        url: api.authenticationStrategies[config.name].url,
                        type: api.authenticationStrategies[config.name].type,
                        title: api.authenticationStrategies[config.name].title,
                        textColor: api.authenticationStrategies[config.name].textColor,
                        buttonColor: api.authenticationStrategies[config.name].buttonColor,
                        icon: api.authenticationStrategies[config.name].icon
                    };

                    res.json({
                        token: token.token,
                        expirationDate: token.expirationDate,
                        user: UserTransformer.transform(req.user, { path: req.getRoot() }),
                        device: req.provisionedDevice,
                        api: api
                    });
                }).catch(err => {
                    next(err);
                });
            });

            req.session = null;
        }
    );

    app.get(
        '/auth/' + config.name + '/callback',
        authenticate,
        function (req, res) {
            if (req.query.state === 'mobile') {
                let uri;
                if (!req.user.active || !req.user.enabled) {
                    uri = `mage://app/invalid_account?active=${req.user.active}&enabled=${req.user.enabled}`;
                } else {
                    uri = `mage://app/authentication?token=${req.token}`
                }

                if (config.redirect) {
                    res.redirect(uri);
                } else {
                    res.render(config.name, { uri: uri });
                }
            } else {
                res.render('authentication', { host: req.getRoot(), login: { token: req.token, user: req.user } });
            }
        }
    );

};

module.exports = {
    initialize
}