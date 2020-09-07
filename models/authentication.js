"use strict";

const mongoose = require('mongoose')
    , log = require('winston')
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
    password: { type: String, required: false },
    previousPasswords: { type: [String], required: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
            User.getUserById(authentication.userId, done);
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
            PasswordPolicyEnforcer.enforce(authentication.type, existingUser.authentication, authentication).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
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
            User.getUserById(auth.userId, done);
        },
        function (user, done) {
            Token.removeTokensForUser(user, function (err) {
                if (err) return done(err);

                done();
            });
        }
    ], function (err) {
        return next(err);
    });

});

function transform(auth, ret) {

}

AuthenticationSchema.set("toObject", {
    transform: transform
});

AuthenticationSchema.set("toJSON", {
    transform: transform
});

const Authentication = mongoose.model('Authentication', AuthenticationSchema);
exports.Model = Authentication;

exports.getAuthenticationById = function (id) {
    return Authentication.findById(id).exec();
};

exports.getAuthenticationByAuthIdAndType = function (authId, authType) {
    return Authentication.findOne({ id: authId, type: authType }).exec();
};

exports.getAuthenticationByUserId = function (userid) {
    return Authentication.findOne({ userId: userid }).exec();
};

exports.createAuthentication = function (authentication, userId) {
    const update = {
        type: authentication.type,
        id: authentication.id,
        password: authentication.password,
        previousPasswords: [],
        userId: userId,
        security: {
            locked: false,
            lockedUntil: null
        }
    };
    return Authentication.create(update);
};

exports.updateAuthentication = function (authentication) {
    return authentication.save();
};

exports.removeAuthenticationById = function (authenticationId, done) {
    authentication.findByIdAndRemove(authenticationId, done);
};