"use strict";

const mongoose = require('mongoose')
    , async = require("async")
    , hasher = require('../utilities/pbkdf2')()
    , User = require('./user')
    , Token = require('./token')
    , PasswordValidator = require('../utilities/passwordValidator')
    , PasswordPolicyEnforcer = require('../utilities/passwordPolicyEnforcer');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const AuthenticationSchema = new Schema({
    type: { type: String, required: false },
    id: { type: String, required: false },
    password: { type: String, required: true },
    previousPasswords: { type: [String], required: false },
    security: {
        locked: { type: Boolean },
        lockedUntil: { type: Date },
        invalidLoginAttempts: { type: Number, default: 0 },
        numberOfTimesLocked: { type: Number, default: 0 }
    }
}, {
    versionKey: false,
    timestamps: {
        updatedAt: 'lastUpdated'
    }
});

// Encrypt password before save
AuthenticationSchema.pre('save', function (next) {
    const authentication = this;

    // only hash the password if it has been modified (or is new)
    if (authentication.type !== 'local' || !authentication.isModified('password')) {
        return next();
    }

    async.waterfall([
        function (done) {
            User.getUserByAuthenticationId(authentication._id).then(user => {
                done(null, user);
            }).catch(err => {
                done(err);
            });
        },
        function (existingUser, done) {
            let previousPasswords = [];
            if (existingUser) {
                previousPasswords.push(authentication.password);
                previousPasswords = previousPasswords.concat(existingUser.authentication.previousPasswords);
            }

            PasswordValidator.validate(authentication.type, authentication.password, previousPasswords).then(validationStatus => {
                if (!validationStatus.isValid) {
                    let err = new Error(validationStatus.msg);
                    err.status = 400;
                    return done(err);
                }
                done(null, existingUser);
            }).catch(err => {
                done(err);
            });
        },
        function (existingUser, done) {
            if (existingUser) {
                PasswordPolicyEnforcer.enforce(authentication.type, existingUser.authentication, authentication).then(() => {
                    done();
                }).catch(err => {
                    done(err);
                });
            }
            else {
                done();
            }
        },
        function (done) {
            // Finally hash the password
            hasher.hashPassword(authentication.password, function (err, hashedPassword) {
                if (err) return next(err);

                authentication.password = hashedPassword;
                done();
            });
        }
    ], function (err) {
        return next(err);
    });
});

// Remove Token if password changed
AuthenticationSchema.pre('save', function (next) {
    const auth = this;

    // only hash the password if it has been modified (or is new)
    if (!auth.isModified('password')) {
        return next();
    }

    async.waterfall([
        function (done) {
            User.getUserByAuthenticationId(auth._id).then(user => {
                done(null, user);
            }).catch(err => {
                done(err);
            });
        },
        function (user, done) {
            if (user) {
                Token.removeTokensForUser(user, function (err) {
                    if (err) return done(err);

                    done();
                });
            } else {
                done();
            }
        }
    ], function (err) {
        return next(err);
    });

});

const transform = function (auth, ret) {
    //TODO figure out when/where this is called
    //delete ret.authentication.password;
}

AuthenticationSchema.set("toObject", {
    transform: transform
});

AuthenticationSchema.set("toJSON", {
    transform: transform
});

exports.transform = transform;

const Authentication = mongoose.model('Authentication', AuthenticationSchema);
exports.Model = Authentication;

exports.getAuthenticationById = function (id) {
    return Authentication.findById(id).exec();
};

exports.getAuthenticationByAuthIdAndType = function (authId, authType) {
    return Authentication.findOne({ id: authId, type: authType }).exec();
};

exports.createAuthentication = function (authentication) {
    const newAuth = new Authentication({
        type: authentication.type,
        id: authentication.id,
        password: authentication.password,
        previousPasswords: [],
        security: {
            locked: false,
            lockedUntil: null
        }
    });
    return newAuth.save();
};

exports.updateAuthentication = async function (authentication) {
    try {
        const auth = await Authentication.findById(authentication._id).exec();
        auth.password = authentication.password;
        return auth.save();
    }
    catch (err) {
        return Promise.reject(err);
    }
};

exports.removeAuthenticationById = function (authenticationId, done) {
    Authentication.findByIdAndRemove(authenticationId, done);
};

exports.validPassword = function (authenticationId, password, callback) {
    Authentication.findById(authenticationId).exec().then(auth => {
        if (auth.type !== 'local') return callback(null, false);

        hasher.validPassword(password, auth.password, callback);
    }).catch(err => {
        callback(err);
    });
};