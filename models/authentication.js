"use strict";

const mongoose = require('mongoose')
    , log = require('winston')
    , async = require("async")
    , hasher = require('../utilities/pbkdf2')()
    , PasswordValidator = require('../utilities/passwordValidator')
    , PasswordPolicyEnforcer = require('../utilities/passwordPolicyEnforcer');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const AuthenticationSchema = new Schema({
    type: { type: String, required: false },
    id: { type: String, required: false },
    password: { type: String, required: false },
    previousPasswords: { type: [String], required: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true  },
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

AuthenticationSchema.method('validPassword', function (password, callback) {
    if (this.type !== 'local') return callback(null, false);

    hasher.validPassword(password, this.password, callback);
});
